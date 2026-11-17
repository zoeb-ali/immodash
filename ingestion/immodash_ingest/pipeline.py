"""Acquire -> parse -> load bronze, for every registered source.

Usage:
    python -m immodash_ingest            # try to refresh downloads, fall back to local raw files
    python -m immodash_ingest --offline  # only use files already in data/raw

Every online run appends one line per source to data/history/ingest_log.csv (what was fetched, its
checksum, whether the download failed and the cached copy was used) and one line per bronze table to
data/history/bronze_volumes.csv. The run fails when a source has fallen back to its cached copy for
IMMODASH_MAX_FALLBACK_RUNS runs in a row (default 3), or when a table loses more than
IMMODASH_MAX_ROW_DROP (default 20 %) of its rows compared with the last online run.
"""

from __future__ import annotations

import argparse
import csv
import logging
import os
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from . import http
from .config import PROJECT_ROOT, SOURCES, Source, city_kreis_codes, raw_path
from .schemas import check_schema
from .sources import bundesbank, geo, greix, vgrdl, zensus, zensus_grid
from .warehouse import load_bronze

HISTORY_DIR = Path(os.getenv("IMMODASH_HISTORY_DIR", PROJECT_ROOT / "data" / "history"))
LOG_FIELDS = ["run_id", "run_at", "source", "status", "sha256", "bytes", "last_modified", "fallback_streak", "error"]
VOLUME_FIELDS = ["run_id", "run_at", "table", "rows", "previous_rows", "change_pct"]


class IngestHealthError(RuntimeError):
    """The data could be loaded, but its health checks failed (stale fallbacks or a large row drop)."""


log = logging.getLogger("immodash_ingest")


@dataclass(frozen=True)
class Job:
    source_key: str
    table: str
    parser: Callable[[Path], pd.DataFrame]


def _geo() -> Path:
    return raw_path("geo_kreise")


JOBS: list[Job] = [
    Job("zensus_rent_by_rooms", "zensus_rent_by_rooms", zensus.parse),
    Job("zensus_vacancy", "zensus_vacancy", zensus.parse_vacancy),
    Job("zensus_rent_by_size", "zensus_rent_by_size", zensus.parse_rent_by_size),
    Job("zensus_bezirke_rent", "zensus_bezirke_rent", zensus.parse_bezirke_rent),
    Job("zensus_grid_rent", "zensus_grid_rent_1km", lambda p: zensus_grid.parse_1km(p, _geo())),
    Job(
        "zensus_grid_rent",
        "zensus_grid_rent_100m",
        lambda p: zensus_grid.parse_100m_for(p, _geo(), city_kreis_codes(), raw_path("osm_postcodes")),
    ),
    Job("geo_kreise", "geo_kreise_outline_3035", lambda p: zensus_grid.kreis_outlines_3035(p)),
    Job("vgrdl_income", "vgrdl_income_population", vgrdl.parse),
    Job("greix_rents", "greix_city_rents", greix.parse_rents),
    Job("greix_rent_vs_sales", "greix_rent_vs_sales", greix.parse_rent_vs_sales),
    Job("bundesbank_mortgage_rate", "bundesbank_mortgage_rate", bundesbank.parse),
    Job("geo_kreise", "geo_kreise", geo.parse),
]


@dataclass
class Acquired:
    """What happened when we tried to refresh one source."""

    source: str
    path: Path
    status: str  # downloaded | unchanged | fallback | manual | offline
    sha256: str = ""
    bytes: int = 0
    last_modified: str | None = None
    error: str = ""
    fallback_streak: int = 0
    extra: dict = field(default_factory=dict)


def acquire(source: Source, offline: bool) -> Acquired:
    """Refresh the raw file if possible; otherwise keep the existing local copy and say so."""
    path = raw_path(source)
    previous = http.sha256_of(path) if path.exists() else ""
    if offline:
        return Acquired(source.key, path, "offline", previous, path.stat().st_size if path.exists() else 0)
    try:
        if source.key.startswith("zensus_") and source.url is None:
            if not os.getenv("ZENSUS_API_TOKEN"):
                return Acquired(source.key, path, "manual", previous, path.stat().st_size if path.exists() else 0)
            zensus.fetch_via_api(path, table=path.name.split("_")[0])
            digest = http.sha256_of(path)
            return Acquired(
                source.key, path, "unchanged" if digest == previous else "downloaded", digest, path.stat().st_size
            )
        if source.url:
            d = http.download(source.url, path, expect_sha256=source.sha256)
            return Acquired(
                source.key,
                path,
                "unchanged" if d.sha256 == previous else "downloaded",
                d.sha256,
                d.bytes,
                d.last_modified,
            )
        return Acquired(source.key, path, "manual", previous, path.stat().st_size if path.exists() else 0)
    except Exception as exc:  # noqa: BLE001 - a failing source must not stop the others; it is counted below
        if not path.exists():
            raise
        log.warning("refresh failed for %s (%s); using cached %s", source.key, exc, path.name)
        return Acquired(
            source.key, path, "fallback", previous, path.stat().st_size, error=f"{type(exc).__name__}: {exc}"[:300]
        )


def _read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _append_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    new = not path.exists()
    with open(path, "a", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        if new:
            w.writeheader()
        w.writerows(rows)


def _fallback_streaks(acquired: list[Acquired], history: list[dict[str, str]]) -> None:
    """Consecutive online runs (including this one) in which each source fell back to its cached copy."""
    by_source: dict[str, list[str]] = {}
    for row in history:
        by_source.setdefault(row["source"], []).append(row["status"])
    for a in acquired:
        if a.status != "fallback":
            continue
        streak = 1
        for status in reversed(by_source.get(a.source, [])):
            if status != "fallback":
                break
            streak += 1
        a.fallback_streak = streak


def _summary(lines: list[str]) -> None:
    """Write to the GitHub Actions job summary when running there, and always to the log."""
    for line in lines:
        log.info(line)
    target = os.getenv("GITHUB_STEP_SUMMARY")
    if target:
        with open(target, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")


def run(offline: bool = False, warehouse_url: str | None = None, record: bool | None = None) -> dict[str, int]:
    """Ingest every source into bronze. `record` (default: online runs only) writes the history logs and
    applies the health checks."""
    record = (not offline) if record is None else record
    run_id, run_at = uuid.uuid4().hex[:12], datetime.now(UTC).isoformat(timespec="seconds")
    results: dict[str, int] = {}
    acquired: dict[str, Acquired] = {}
    for job in JOBS:
        source = SOURCES[job.source_key]
        if source.key not in acquired:
            acquired[source.key] = acquire(source, offline)
        a = acquired[source.key]
        if not a.path.exists():
            raise FileNotFoundError(f"{source.key}: missing raw file {a.path}")
        df = job.parser(a.path)
        if df.empty:
            raise ValueError(f"{source.key}: parser returned no rows")
        check_schema(job.table, df)
        results[job.table] = load_bronze(df, job.table, source_key=source.key, url=warehouse_url, file_sha256=a.sha256)

    if not record:
        return results

    log_path, vol_path = HISTORY_DIR / "ingest_log.csv", HISTORY_DIR / "bronze_volumes.csv"
    history = _read_csv(log_path)
    _fallback_streaks(list(acquired.values()), history)
    _append_csv(
        log_path,
        LOG_FIELDS,
        [
            {
                "run_id": run_id,
                "run_at": run_at,
                "source": a.source,
                "status": a.status,
                "sha256": a.sha256,
                "bytes": a.bytes,
                "last_modified": a.last_modified or "",
                "fallback_streak": a.fallback_streak,
                "error": a.error,
            }
            for a in acquired.values()
        ],
    )

    previous: dict[str, int] = {}
    for row in _read_csv(vol_path):
        previous[row["table"]] = int(row["rows"])
    volumes: list[dict[str, object]] = []
    for table, n in results.items():
        prev = previous.get(table)
        change = None if not prev else round(100 * (n - prev) / prev, 1)
        volumes.append(
            {
                "run_id": run_id,
                "run_at": run_at,
                "table": table,
                "rows": n,
                "previous_rows": prev or "",
                "change_pct": "" if change is None else change,
            }
        )
    _append_csv(vol_path, VOLUME_FIELDS, volumes)

    max_fallbacks = int(os.getenv("IMMODASH_MAX_FALLBACK_RUNS", "3"))
    max_drop = float(os.getenv("IMMODASH_MAX_ROW_DROP", "20"))
    lines = ["### Ingest", "", "| Source | Status | Fallback streak | Error |", "| --- | --- | --- | --- |"]
    lines += [f"| {a.source} | {a.status} | {a.fallback_streak or ''} | {a.error[:80]} |" for a in acquired.values()]
    _summary(lines)
    problems = [
        f"{a.source} has used its cached copy for {a.fallback_streak} runs in a row ({a.error})"
        for a in acquired.values()
        if a.fallback_streak >= max_fallbacks
    ]
    problems += [
        f"bronze.{v['table']} dropped {v['change_pct']} % rows ({v['previous_rows']} -> {v['rows']})"
        for v in volumes
        if v["change_pct"] != "" and float(str(v["change_pct"])) < -max_drop
    ]
    if problems:
        _summary(["", "**Ingest health checks failed:**", *[f"- {p}" for p in problems]])
        raise IngestHealthError("; ".join(problems))
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--offline", action="store_true", help="use only files in data/raw")
    parser.add_argument("--no-record", action="store_true", help="do not write the history logs or run health checks")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    for table, n in run(offline=args.offline, record=False if args.no_record else None).items():
        print(f"bronze.{table:<28} {n:>7} rows")


if __name__ == "__main__":
    main()
