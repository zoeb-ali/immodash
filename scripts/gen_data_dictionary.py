"""Write docs/DATA_DICTIONARY.md, the codebook of every gold and ml table, from three sources of truth:

- the live warehouse schema (tables, columns, types, row counts),
- the dbt model files (purpose comment at the top of each .sql, tests in _marts.yml),
- docs/codebook/columns.yml (one definition per column name, unit, allowed values).

Usage:
    python scripts/gen_data_dictionary.py          # rewrite docs/DATA_DICTIONARY.md
    python scripts/gen_data_dictionary.py --check  # exit 1 if a column has no definition (for CI / make docs-check)
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ingestion"))

from immodash_ingest.warehouse import read_sql  # noqa: E402

CODEBOOK = ROOT / "docs" / "codebook" / "columns.yml"
OUT = ROOT / "docs" / "DATA_DICTIONARY.md"
MARTS = ROOT / "dbt" / "models" / "marts"

# Files the website reads (web/public/data) -> API endpoint -> warehouse table(s). Keep in sync with
# scripts/export_static.py when a file is added.
PUBLISHED = [
    ("cities.json", "/cities", "gold.fct_city_snapshot"),
    ("monthly.json", "/rents/monthly", "gold.fct_city_rent_monthly"),
    ("forecasts.json", "/forecasts", "ml.rent_forecast"),
    ("backtest.json", "/forecasts/backtest", "ml.forecast_backtest"),
    ("anomalies.json", "/anomalies", "ml.rent_anomalies"),
    ("market-pressure.json", "/market-pressure", "gold.fct_city_market_pressure"),
    ("mortgage-rates.json", "/mortgage-rates", "gold.fct_mortgage_rates"),
    ("kreise-affordability.json", "/kreise/affordability", "gold.fct_kreis_affordability"),
    ("kreise-supply-demand.json", "/kreise/supply-demand", "gold.fct_kreis_supply_demand"),
    ("cities-supply-demand.json", "/cities/supply-demand", "gold.fct_city_supply_demand"),
    ("kreise-asking-rents.json", "/kreise/{ags}/asking-rents (all rooms)", "gold.fct_kreis_asking_rent_estimate"),
    ("kreise-rents-by-size.json", "/kreise/rents-by-size", "gold.fct_kreis_rent_by_size"),
    ("kreise-rent-range.json", "/kreise/rent-range", "gold.fct_kreis_rent_range"),
    ("postcodes.json", "/postcodes/rents", "gold.fct_postcode_rent (ODbL)"),
    ("bezirke.json", "/bezirke/rents", "gold.fct_bezirk_rent"),
    ("grid/{ags}.json", "/kreise/{ags}/grid", "gold.fct_grid_rent_cells (100 m)"),
    ("geo-kreise.json, geo-kreise-lite.json", "/geo/kreise", "silver.stg_geo__kreise"),
    ("summaries/{city}.json", "/cities/{city}/summary", "gold.fct_city_snapshot + Groq LLM"),
    ("sources.json", "/meta/sources", "ingestion source registry"),
    ("meta.json", "(written by the export)", "run date, latest month, file counts"),
]


def purpose(table: str) -> str:
    """First comment block of the model's .sql file, without the 'Gold:' prefix."""
    sql = MARTS / f"{table}.sql"
    if not sql.exists():
        return ""
    lines = []
    for line in sql.read_text(encoding="utf-8").splitlines():
        if not line.startswith("--"):
            break
        lines.append(line.lstrip("- ").strip())
    text = " ".join(lines)
    text = re.sub(r"^Gold:\s*", "", text)
    return text[:1].upper() + text[1:]


def dbt_tests() -> dict[str, list[str]]:
    """model -> human-readable test list, from dbt/models/marts/_marts.yml."""
    spec = yaml.safe_load((MARTS / "_marts.yml").read_text(encoding="utf-8"))
    out: dict[str, list[str]] = {}
    for m in spec.get("models", []):
        tests = []
        for col in m.get("columns", []) or []:
            for t in col.get("data_tests", []) or []:
                if isinstance(t, str):
                    tests.append(f"`{col['name']}` {t.replace('_', ' ')}")
                else:
                    name, cfg = next(iter(t.items()))
                    args = (cfg or {}).get("arguments", {}) if isinstance(cfg, dict) else {}
                    if name == "between":
                        tests.append(f"`{col['name']}` between {args.get('min_value')} and {args.get('max_value')}")
                    elif name == "relationships":
                        tests.append(f"`{col['name']}` exists in {args.get('to', '').replace('ref(', '').strip(')')}")
                    else:
                        tests.append(f"`{col['name']}` {name}")
        for t in m.get("data_tests", []) or []:
            if isinstance(t, dict) and "unique" in t:
                tests.append(f"unique `{t['unique']['arguments']['column_name']}`")
        out[m["name"]] = tests
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="only verify every column is defined")
    args = ap.parse_args()
    if not os.getenv("WAREHOUSE_URL") and not os.getenv("DATABASE_URL"):
        os.environ["WAREHOUSE_URL"] = f"duckdb:///{ROOT / 'warehouse' / 'immodash.duckdb'}"

    book = yaml.safe_load(CODEBOOK.read_text(encoding="utf-8"))
    coldefs, tabledefs = book["columns"], book.get("tables", {})
    cols = read_sql(
        "select table_schema, table_name, column_name, data_type, ordinal_position "
        "from information_schema.columns where table_schema in ('gold', 'ml') "
        "order by table_schema, table_name, ordinal_position"
    )
    missing = sorted({c for c in cols["column_name"] if c not in coldefs})
    if missing:
        print("Columns without a definition in docs/codebook/columns.yml:", ", ".join(missing))
        if args.check:
            return 1
    elif args.check:
        print(f"OK: all {cols['column_name'].nunique()} column names are defined.")
        return 0

    tests = dbt_tests()
    lines = [
        "# Data dictionary",
        "",
        f"Generated by `scripts/gen_data_dictionary.py` on {date.today().isoformat()} from the warehouse schema, the dbt models",
        "and `docs/codebook/columns.yml`. Do not edit by hand: change the codebook or the model, then run `make docs`.",
        "",
        "Layers: **bronze** = raw files as loaded, **silver** = cleaned staging views (`stg_*`), **gold** = analysis tables",
        "(`dim_*`, `fct_*`), **ml** = model outputs. Only gold and ml are documented column by column; the website and API",
        "read nothing else.",
        "",
        "## Tables",
        "",
        "| Table | Rows | Purpose |",
        "| --- | ---: | --- |",
    ]
    tables = cols[["table_schema", "table_name"]].drop_duplicates().itertuples(index=False)
    tables = list(tables)
    counts = {}
    for schema, table in tables:
        counts[(schema, table)] = int(read_sql(f"select count(*) as n from {schema}.{table}")["n"].iloc[0])
        desc = tabledefs.get(f"{schema}.{table}") or purpose(table)
        short = desc.split(". ")[0].rstrip(".") + "."
        lines.append(f"| [`{schema}.{table}`](#{schema}{table}) | {counts[(schema, table)]:,} | {short} |")

    for schema, table in tables:
        desc = tabledefs.get(f"{schema}.{table}") or purpose(table)
        model = f" · Source model: `dbt/models/marts/{table}.sql`" if schema == "gold" else " · Written by `python -m ml`"
        lines += ["", f"## {schema}.{table}", "", desc or "_No description._", "",
                  f"Rows: {counts[(schema, table)]:,}{model}", "",
                  "| Column | Type | Unit | Definition |", "| --- | --- | --- | --- |"]
        for r in cols[(cols.table_schema == schema) & (cols.table_name == table)].itertuples(index=False):
            d = coldefs.get(r.column_name, {"desc": "**UNDEFINED**"})
            text = d["desc"] + (f" Values: {d['values']}." if d.get("values") else "")
            lines.append(f"| `{r.column_name}` | {r.data_type} | {d.get('unit', '')} | {text.replace('|', '/')} |")
        if tests.get(table):
            lines += ["", "Data tests: " + "; ".join(tests[table]) + "."]

    lines += ["", "## Published files", "",
              "What the website reads from `web/public/data/`, written by `scripts/export_static.py` through the API.", "",
              "| File | API endpoint | Source |", "| --- | --- | --- |"]
    lines += [f"| `{f}` | `{e}` | {s} |" for f, e, s in PUBLISHED]
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(tables)} tables, {len(cols)} columns")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
