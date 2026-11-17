"""Flag unusual month-on-month moves in city asking rents.

Signal (v2, audit ML-8): the month-on-month change of the city's *hedonic rent index* (GREIX, quality
adjusted) minus the cross-city median change in the same month, which removes market-wide moves such as
seasonality. The raw median was used before, but it mostly reflects which flats happened to be listed
that month: Berlin's median fell 8 % in April 2026 and rose 14 % in May while the index barely moved.

Each month is scored with a robust z-score against the city's own trailing 24 months (median / MAD), so a
single outlier cannot inflate its own threshold. |z| >= 3.5 is "unusual" (Iglewicz & Hoaglin). A flag is
only kept when the move *persists*: the following month does not undo more than half of it. The latest
month cannot be checked yet and is marked `pending`.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

THRESHOLD = 3.5
WINDOW = 24
REVERSAL_SHARE = 0.5  # next month undoing more than this share of the move means it did not persist


def detect(monthly: pd.DataFrame, threshold: float = THRESHOLD) -> pd.DataFrame:
    cols = ["city", "city_en", "period_date", "median_rent_sqm"]
    has_index = "nominal_rent_index" in monthly.columns
    df = monthly[cols + (["nominal_rent_index"] if has_index else [])].copy()
    df["period_date"] = pd.to_datetime(df["period_date"])
    df = df.sort_values(["city", "period_date"])
    series = "nominal_rent_index" if has_index else "median_rent_sqm"
    df["mom_pct"] = 100 * df.groupby("city")[series].pct_change()
    df["market_mom_pct"] = df.groupby("period_date")["mom_pct"].transform("median")
    df["excess_pct"] = df["mom_pct"] - df["market_mom_pct"]

    def robust_z(s: pd.Series) -> pd.Series:
        hist = s.shift(1).rolling(WINDOW, min_periods=12)
        med = hist.median()
        mad = hist.apply(lambda w: np.median(np.abs(w - np.median(w))), raw=True)
        return (s - med) / (1.4826 * mad.replace(0, np.nan))

    df["robust_z"] = df.groupby("city")["excess_pct"].transform(robust_z)
    nxt = df.groupby("city")["excess_pct"].shift(-1)
    reversed_ = np.sign(nxt) == -np.sign(df["excess_pct"])
    undone = reversed_ & (nxt.abs() > REVERSAL_SHARE * df["excess_pct"].abs())
    df["persistence"] = np.where(nxt.isna(), "pending", np.where(undone, "reversed", "persisted"))
    big = df["robust_z"].abs() >= threshold
    df["is_anomaly"] = big & (df["persistence"] != "reversed")
    df["direction"] = np.where(df["excess_pct"] > 0, "spike", "drop")
    df["severity"] = pd.cut(
        df["robust_z"].abs(), [0, threshold, 5, np.inf], labels=["normal", "notable", "extreme"], right=False
    ).astype(str)
    df["signal"] = "hedonic index" if has_index else "median asking rent"
    out = df.dropna(subset=["robust_z"])
    out = out[
        [
            "city",
            "city_en",
            "period_date",
            "median_rent_sqm",
            "mom_pct",
            "market_mom_pct",
            "excess_pct",
            "robust_z",
            "is_anomaly",
            "direction",
            "severity",
            "persistence",
            "signal",
        ]
    ]
    out["period_date"] = out["period_date"].dt.date
    return out.round({"mom_pct": 2, "market_mom_pct": 2, "excess_pct": 2, "robust_z": 2}).reset_index(drop=True)
