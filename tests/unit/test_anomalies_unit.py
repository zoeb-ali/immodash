"""Anomaly detector v2 (ML-8): measured on the index, and a move that is undone next month is not flagged."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ml import anomalies


def _panel(shock: str) -> pd.DataFrame:
    months = pd.date_range("2020-01-01", periods=48, freq="MS")
    rng = np.random.default_rng(3)
    rows = []
    for city in "ABCD":
        idx = 100 * np.cumprod(1 + rng.normal(0.003, 0.002, len(months)))
        if city == "A" and shock == "persist":
            idx[40:] *= 1.06
        if city == "A" and shock == "blip":
            idx[40] *= 1.06  # up one month, straight back down the next
        rows += [
            {"city": city, "city_en": city, "period_date": m, "median_rent_sqm": v / 10, "nominal_rent_index": v}
            for m, v in zip(months, idx, strict=True)
        ]
    return pd.DataFrame(rows)


def test_persistent_jump_is_flagged():
    out = anomalies.detect(_panel("persist"))
    hit = out[(out.city == "A") & (pd.to_datetime(out.period_date) == "2023-05-01")]
    assert hit["is_anomaly"].all() and (hit["persistence"] == "persisted").all()
    assert (out["signal"] == "hedonic index").all()


def test_one_month_blip_is_not_flagged():
    out = anomalies.detect(_panel("blip"))
    hit = out[(out.city == "A") & (pd.to_datetime(out.period_date) == "2023-05-01")]
    assert (hit["persistence"] == "reversed").all() and not hit["is_anomaly"].any()


def test_latest_month_is_pending():
    out = anomalies.detect(_panel("none"))
    last = out[pd.to_datetime(out.period_date) == out.period_date.max()]
    assert (last["persistence"] == "pending").all()
