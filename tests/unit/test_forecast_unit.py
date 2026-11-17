"""Forecast mechanics on synthetic data (fast, no warehouse): no leakage, smoothed base, trend flag (ML-3/4)."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml import forecast


def _synthetic(n_cities: int = 8, months: int = 96, falling: str | None = "C0") -> tuple[pd.DataFrame, ...]:
    rng = np.random.default_rng(1)
    dates = pd.date_range("2016-01-01", periods=months, freq="MS")
    rows = []
    for i in range(n_cities):
        city = f"C{i}"
        drift = -0.004 if city == falling else 0.003
        idx = 100 * np.cumprod(1 + rng.normal(drift, 0.003, months))
        median = idx / 10 * (1 + rng.normal(0, 0.03, months))  # noisy raw median
        rows += [
            {"city": city, "city_en": city, "period_date": d, "nominal_rent_index": x, "median_rent_sqm": m}
            for d, x, m in zip(dates, idx, median, strict=True)
        ]
    monthly = pd.DataFrame(rows)
    rates = pd.DataFrame({"period_date": dates, "rate_pct": 2.0, "change_12m_pp": 0.0})
    pressure = pd.DataFrame(
        {
            "city": [r["city"] for r in rows[::3]],
            "period_date": [r["period_date"] for r in rows[::3]],
            "time_on_market_days_4q": 30.0,
        }
    )
    return monthly, rates, pressure


def test_targets_are_future_changes_and_features_are_past_only():
    monthly, rates, pressure = _synthetic()
    df = forecast.build_features(monthly, rates, pressure)
    c = df[df.city == "C1"].reset_index(drop=True)
    assert np.isclose(c.loc[10, "y3"], c.loc[13, "li"] - c.loc[10, "li"])
    assert np.isclose(c.loc[20, "r12"], c.loc[20, "li"] - c.loc[8, "li"])
    assert c["y12"].tail(12).isna().all()  # the last year has no known 12-month outcome


def test_level_is_a_three_month_average():
    monthly, rates, pressure = _synthetic()
    df = forecast.build_features(monthly, rates, pressure)
    c = df[df.city == "C2"].reset_index(drop=True)
    assert np.isclose(c.loc[50, "level_eur"], c.loc[48:50, "median_rent_sqm"].mean())


def test_backtest_and_forecast_shapes_and_flags():
    monthly, rates, pressure = _synthetic()
    df = forecast.build_features(monthly, rates, pressure)
    summary, per_city, widen = forecast.backtest(df, first_origin="2019-01-01")
    assert set(summary["model"]) == {"lightgbm", "naive_no_change", "drift_last_12m"}
    assert {"bias_pct", "direction_accuracy_pct", "n_falls"} <= set(summary.columns)
    assert set(per_city["city"]) == {f"C{i}" for i in range(8)}
    fc = forecast.forecast(df, widen)
    assert len(fc) == 8 * 3
    assert (fc["p10_rent_sqm"] <= fc["p50_rent_sqm"]).all() and (fc["p50_rent_sqm"] <= fc["p90_rent_sqm"]).all()
    assert fc["target_month"].gt(fc["origin_month"]).all()
    assert fc["disagrees_with_trend"].dtype == bool
