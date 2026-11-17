"""Run the intelligence layer: python -m ml   (after `dbt build`). Writes tables to schema `ml`.

With IMMODASH_RECORD_HISTORY=1 (set by the weekly refresh job) every run also appends its forecasts and
model card to data/history/, so real, live forecast accuracy can be measured later (audit DE-3, ML-10).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import pandas as pd

from immodash_ingest.config import PROJECT_ROOT
from immodash_ingest.warehouse import load_table, read_sql

from . import anomalies, forecast

HISTORY_DIR = Path(os.getenv("IMMODASH_HISTORY_DIR", PROJECT_ROOT / "data" / "history"))


def _append(df: pd.DataFrame, path: Path, key: list[str]) -> int:
    """Append rows to a CSV, skipping rows whose key is already there (re-runs on the same data)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        old = pd.read_csv(path, dtype=str)
        seen = set(map(tuple, old[key].astype(str).to_numpy())) if set(key) <= set(old.columns) else set()
        df = df[[tuple(map(str, r)) not in seen for r in df[key].to_numpy()]]
        df.to_csv(path, mode="a", header=False, index=False, columns=list(old.columns))
    else:
        df.to_csv(path, index=False)
    return len(df)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    monthly = read_sql("select * from gold.fct_city_rent_monthly")
    rates = read_sql("select * from gold.fct_mortgage_rates")
    pressure = read_sql("select * from gold.fct_city_market_pressure")

    fc = forecast.run(monthly, rates, pressure)
    an = anomalies.detect(monthly)
    counts = {
        "rent_forecast": load_table(fc.forecasts, "rent_forecast", schema="ml"),
        "forecast_backtest": load_table(fc.backtest, "forecast_backtest", schema="ml"),
        "forecast_backtest_city": load_table(fc.backtest_city, "forecast_backtest_city", schema="ml"),
        "model_card": load_table(fc.model_card, "model_card", schema="ml"),
        "rent_anomalies": load_table(an, "rent_anomalies", schema="ml"),
    }
    if os.getenv("IMMODASH_RECORD_HISTORY") == "1":
        cols = [
            "origin_month",
            "target_month",
            "horizon_months",
            "city",
            "median_rent_now",
            "p10_rent_sqm",
            "p50_rent_sqm",
            "p90_rent_sqm",
            "change_p50_pct",
            "model_version",
        ]
        hist = fc.forecasts[cols].assign(recorded_at=pd.Timestamp.now(tz="UTC").isoformat(timespec="seconds"))
        n = _append(hist, HISTORY_DIR / "forecasts.csv", ["origin_month", "horizon_months", "city", "model_version"])
        card = fc.model_card.assign(trained_at=fc.model_card["trained_at"].astype(str))
        _append(card, HISTORY_DIR / "model_cards.csv", ["model_version", "history_to", "trained_at"])
        logging.info("history: appended %d forecast rows", n)
    for table, n in counts.items():
        print(f"ml.{table:<24} {n:>6} rows")


if __name__ == "__main__":
    main()
