"""Validate the exported site snapshot (web/public/data) before it is published (audit OPS-1).

dbt tests check the warehouse; this checks what the public actually sees: every file the site reads exists
and parses, counts are complete, and values sit inside plausible bounds. A run that would publish an absurd
forecast or a half-empty file fails here.

    python scripts/validate_snapshot.py                     # web/public/data
    python scripts/validate_snapshot.py --dir /tmp/data --max-age-days 8
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "meta.json",
    "cities.json",
    "monthly.json",
    "forecasts.json",
    "backtest.json",
    "backtest-cities.json",
    "anomalies.json",
    "market-pressure.json",
    "mortgage-rates.json",
    "kreise-affordability.json",
    "kreise-supply-demand.json",
    "cities-supply-demand.json",
    "kreise-asking-rents.json",
    "kreise-rents-by-size.json",
    "bezirke.json",
    "sources.json",
    "freshness.json",
    "estimate-validation.json",
    "kreise-rent-range.json",
    "postcodes.json",
    "geo-kreise.json",
    "geo-kreise-lite.json",
]


class Checker:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def check(self, ok: bool, msg: str) -> None:
        if not ok:
            self.errors.append(msg)

    def between(self, rows: list[dict], key: str, lo: float, hi: float, what: str) -> None:
        bad = [r for r in rows if r.get(key) is not None and not (lo <= r[key] <= hi)]
        self.check(not bad, f"{what}: {len(bad)} rows with {key} outside [{lo}, {hi}], e.g. {bad[:1]}")

    def no_nan(self, obj, where: str) -> None:
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            self.errors.append(f"{where}: NaN or infinity")
        elif isinstance(obj, dict):
            for k, v in obj.items():
                self.no_nan(v, f"{where}.{k}")
        elif isinstance(obj, list):
            for i, v in enumerate(obj[:5000]):
                self.no_nan(v, f"{where}[{i}]")


def validate(data: Path, max_age_days: float | None = None) -> list[str]:
    c = Checker()
    loaded: dict[str, object] = {}
    for name in REQUIRED:
        p = data / name
        if not p.exists():
            c.errors.append(f"missing {name}")
            continue
        try:
            loaded[name] = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            c.errors.append(f"{name} is not valid JSON: {exc}")
    if c.errors:
        return c.errors
    for name, obj in loaded.items():
        if not name.startswith("geo-"):
            c.no_nan(obj, name)

    meta, cities = loaded["meta.json"], loaded["cities.json"]
    c.check(len(cities) == 37, f"cities.json has {len(cities)} cities, expected 37")
    c.between(cities, "median_rent_sqm", 4, 40, "cities")
    c.between(cities, "index_yoy_pct", -25, 25, "cities")
    c.between(cities, "asking_rent_burden_pct", 3, 60, "cities")
    c.between(cities, "reference_monthly_rent_eur", 200, 2500, "cities")
    for city in cities:
        c.check((data / "summaries" / f"{city['slug']}.json").exists(), f"missing summary for {city['city']}")
        c.check((data / "grid" / f"{city['ags']}.json").exists(), f"missing grid for {city['city']}")
        s = data / "summaries" / f"{city['slug']}.json"
        if s.exists():
            summ = json.loads(s.read_text(encoding="utf-8"))
            c.check(
                bool(summ.get("text")) and bool(summ.get("text_de")),
                f"summary for {city['city']} lacks text or text_de",
            )

    fc = loaded["forecasts.json"]
    c.check(len(fc) == 37 * 3, f"forecasts.json has {len(fc)} rows, expected 111")
    c.between(fc, "change_p50_pct", -20, 20, "forecasts")
    bad_band = [f for f in fc if not (f["p10_rent_sqm"] <= f["p50_rent_sqm"] <= f["p90_rent_sqm"])]
    c.check(not bad_band, f"forecasts: {len(bad_band)} rows where p10 <= p50 <= p90 does not hold")
    bt = [b for b in loaded["backtest.json"] if b["model"] == "lightgbm" and b["horizon_months"] == 12]
    c.check(bool(bt), "backtest.json has no 12-month LightGBM row")
    if bt:
        c.check(bt[0]["mape_pct"] < 6, f"12-month backtest error {bt[0]['mape_pct']} % is implausibly high")
        cov = bt[0]["coverage_80_pct"]
        c.check(cov is None or 60 <= cov <= 95, f"12-month 80 % coverage {cov} % is outside 60 to 95 %")

    for name in ("kreise-affordability.json", "kreise-supply-demand.json", "kreise-rent-range.json"):
        c.check(len(loaded[name]) == 400, f"{name} has {len(loaded[name])} rows, expected 400")
    ask = [r for r in loaded["kreise-asking-rents.json"] if r["rooms"] == "total"]
    c.check(len(ask) == 400, f"kreise-asking-rents.json has {len(ask)} total rows, expected 400")
    c.between(ask, "estimated_asking_rent_eur_sqm", 3, 40, "asking rents")
    c.check(
        sum(1 for r in ask if r["is_modelled"]) >= 300,
        "fewer modelled districts than expected; check the estimate join",
    )
    c.check(len(loaded["postcodes.json"]) >= 900, f"postcodes.json has only {len(loaded['postcodes.json'])} rows")
    c.check(len(loaded["geo-kreise.json"]["features"]) >= 400, "geo-kreise.json has fewer than 400 features")
    c.check(len(loaded["estimate-validation.json"]) >= 30, "estimate-validation.json is incomplete")
    c.check(len(loaded["monthly.json"]) >= 37 * 24, "monthly.json is unexpectedly short")

    if max_age_days is not None:
        gen = datetime.fromisoformat(meta["generated_at"])
        age = (datetime.now(UTC) - gen).total_seconds() / 86400
        c.check(age <= max_age_days, f"snapshot generated {age:.1f} days ago (limit {max_age_days})")
    return c.errors


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", type=Path, default=ROOT / "web" / "public" / "data")
    ap.add_argument("--max-age-days", type=float, default=None)
    args = ap.parse_args()
    errors = validate(args.dir, args.max_age_days)
    if errors:
        print(f"Snapshot validation FAILED ({len(errors)} problems):")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"Snapshot OK: {args.dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
