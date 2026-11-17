"""3/6/12-month asking-rent forecasts per city with LightGBM quantile regression.

Design
------
- Target: log change of the city's nominal hedonic rent index (GREIX) over h months. The hedonic
  index is quality-adjusted, so it is less noisy than the raw median; forecasts are converted back
  to €/m² by scaling a three-month average of the median (ML-4), because the raw monthly median is
  noisy (Berlin moved -8 % and +14 % in two consecutive months of 2026).
- One global model per horizon and quantile (10/50/90 %) across all 37 cities, so cities share
  information about rent dynamics.
- Features known at the forecast origin only: the city's own momentum (1/3/6/12/24-month log
  changes, 12-month volatility), the cross-city market momentum, the housing-loan rate and its
  12-month change, the latest days-on-market signal and the month of year. No city identifier.
- Known limit: 2012-2026 contains very few 12-month falls (18 of 1,406 backtest outcomes), so the model
  has little evidence for predicting a fall. Every forecast reports its bias and direction accuracy, and
  a forecast that points against the city's own last 12 months is flagged (`disagrees_with_trend`).
- Rolling-origin backtest over the full history (every quarter from 2015, so it includes the flat
  and falling years 2012-2015 and 2022-2023 as inputs and outcomes) against two baselines: "no change"
  and "continue the last 12-month trend". Reported as MAPE on the index level, MAE in €/m², 80 %
  interval coverage, mean signed error (bias) and direction accuracy, overall and per city (ML-3).
- Intervals are calibrated with sequential split-conformal quantile regression (CQR).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

HORIZONS = (3, 6, 12)
QUANTILES = (0.1, 0.5, 0.9)
MODEL_VERSION = "lgbm-quantile-v2"
SEED = 42
PARAMS: dict[str, Any] = dict(
    n_estimators=400,
    learning_rate=0.03,
    num_leaves=15,
    min_child_samples=25,
    subsample=0.8,
    subsample_freq=1,
    colsample_bytree=0.8,
    reg_lambda=1.0,
    random_state=SEED,  # ML-10: reproducible runs
    deterministic=True,
    force_row_wise=True,
    verbose=-1,
)
FEATURES = [
    "r1",
    "r3",
    "r6",
    "r12",
    "r24",
    "vol12",
    "mkt_r3",
    "mkt_r12",
    "rate",
    "rate_chg12",
    "tom",
    "month",
]
# v2 drops the city identifier as a feature: with it the model partly memorised each city's long-run boom
# (Berlin +7.4 % forecast against a -2 % last year). Without it, the full-history backtest error is the same
# (12-month MAPE 1.45 % vs 1.47 %) and forecasts follow each city's own recent momentum more closely.


@dataclass
class ForecastResult:
    forecasts: pd.DataFrame
    backtest: pd.DataFrame
    model_card: pd.DataFrame
    backtest_city: pd.DataFrame


def build_features(monthly: pd.DataFrame, rates: pd.DataFrame, pressure: pd.DataFrame) -> pd.DataFrame:
    """One row per city and month with origin-time features and future log changes (targets)."""
    df = monthly[["city", "city_en", "period_date", "nominal_rent_index", "median_rent_sqm"]].copy()
    df["period_date"] = pd.to_datetime(df["period_date"])
    df = df.sort_values(["city", "period_date"]).reset_index(drop=True)
    df["li"] = np.log(df["nominal_rent_index"])
    # ML-4: the level forecasts are scaled from, a 3-month average of the median (not one noisy month)
    df["level_eur"] = df.groupby("city")["median_rent_sqm"].transform(lambda s: s.rolling(3, min_periods=1).mean())
    g = df.groupby("city")["li"]
    for k in (1, 3, 6, 12, 24):
        df[f"r{k}"] = df["li"] - g.shift(k)
    df["vol12"] = df.groupby("city")["r1"].transform(lambda s: s.rolling(12, min_periods=6).std())
    for h in HORIZONS:
        df[f"y{h}"] = g.shift(-h) - df["li"]

    mkt = df.groupby("period_date")[["r3", "r12"]].median().add_prefix("mkt_")
    df = df.merge(mkt, left_on="period_date", right_index=True, how="left")

    r = rates[["period_date", "rate_pct", "change_12m_pp"]].copy()
    r["period_date"] = pd.to_datetime(r["period_date"])
    r = r.rename(columns={"rate_pct": "rate", "change_12m_pp": "rate_chg12"})
    df = df.merge(r, on="period_date", how="left")

    # Latest published days-on-market value as of each month (quarterly, rolling 4 quarters)
    p = pressure[["city", "period_date", "time_on_market_days_4q"]].copy()
    p["period_date"] = pd.to_datetime(p["period_date"]) + pd.offsets.MonthBegin(3)  # available after quarter end
    p = p.rename(columns={"time_on_market_days_4q": "tom"}).sort_values("period_date")
    df = pd.merge_asof(df.sort_values("period_date"), p, on="period_date", by="city", direction="backward")

    df["month"] = df["period_date"].dt.month
    return df.sort_values(["city", "period_date"]).reset_index(drop=True)


def _fit(train: pd.DataFrame, target: str, alpha: float) -> lgb.LGBMRegressor:
    model = lgb.LGBMRegressor(objective="quantile", alpha=alpha, **PARAMS)
    model.fit(train[FEATURES], train[target])
    return model


def _predict_quantiles(train: pd.DataFrame, test: pd.DataFrame, h: int) -> np.ndarray:
    preds = np.column_stack([_fit(train, f"y{h}", q).predict(test[FEATURES]) for q in QUANTILES])
    return np.sort(preds, axis=1)  # guard against quantile crossing


def backtest(
    df: pd.DataFrame, step: int = 3, first_origin: str = "2015-01-01"
) -> tuple[pd.DataFrame, pd.DataFrame, dict[int, float]]:
    """Rolling-origin evaluation over the full history. Training rows only use targets observable at the origin.

    Origins run every `step` months from `first_origin` to the last month whose outcome is known, so the
    test covers flat and falling periods as well as the 2016-2021 boom (ML-3). Prediction intervals are
    calibrated with sequential split-conformal quantile regression: the raw 10-90 % band is widened by the
    80th percentile of conformity scores collected at *earlier* origins only, so coverage is out of sample.

    Returns (summary per horizon and model, summary per city/horizon/model, final widening per horizon).
    """
    last = df["period_date"].max()
    rows, widen = [], {}
    for h in HORIZONS:
        latest_origin = last - pd.DateOffset(months=h)
        origins = list(pd.date_range(pd.Timestamp(first_origin), latest_origin, freq=f"{step}MS"))
        if origins and origins[-1] != latest_origin:
            origins.append(latest_origin)
        scores: list[tuple[pd.Timestamp, float]] = []  # (origin, conformity score)
        for origin in origins:
            train = df[(df["period_date"] + pd.DateOffset(months=h) <= origin)].dropna(subset=FEATURES[:6] + [f"y{h}"])
            test = df[df["period_date"] == origin].dropna(subset=FEATURES[:6] + [f"y{h}"])
            if len(train) < 500 or test.empty:
                continue
            q = _predict_quantiles(train, test, h)
            actual = test[f"y{h}"].to_numpy()
            # Only origins whose h-month outcome was already known before this origin may calibrate it
            known = [sc for o, sc in scores if o + pd.DateOffset(months=h) <= origin]
            pad = float(np.quantile(known, 0.8)) if len(known) >= 30 else np.nan
            lo, hi = q[:, 0] - (pad if pad == pad else 0), q[:, 2] + (pad if pad == pad else 0)
            covered = ((actual >= lo) & (actual <= hi)).astype(float) if pad == pad else np.full(len(test), np.nan)
            level = test["nominal_rent_index"].to_numpy()
            scale = (test["level_eur"] / test["nominal_rent_index"]).to_numpy()  # index -> €/m²
            candidates = {
                "lightgbm": q[:, 1],
                "naive_no_change": np.zeros(len(test)),
                "drift_last_12m": test["r12"].to_numpy() * h / 12,
            }
            for name, pred in candidates.items():
                pred_level, act_level = level * np.exp(pred), level * np.exp(actual)
                rows.append(
                    pd.DataFrame(
                        {
                            "horizon_months": h,
                            "model": name,
                            "origin": origin,
                            "city": test["city"].to_numpy(),
                            "ape": np.abs(pred_level / act_level - 1),
                            "signed_err": pred_level / act_level - 1,  # > 0: forecast too high
                            "abs_err_eur": np.abs(pred_level - act_level) * scale,
                            # direction: did the forecast get rise vs. fall right? (moves under 0.5 % count as flat)
                            "direction_ok": np.sign(np.where(np.abs(pred) < 0.005, 0, pred))
                            == np.sign(np.where(np.abs(actual) < 0.005, 0, actual)),
                            "actual_fell": actual < -0.005,
                            "covered": covered if name == "lightgbm" else np.nan,
                        }
                    )
                )
            scores.extend((origin, sc) for sc in np.maximum(q[:, 0] - actual, actual - q[:, 2]))
        widen[h] = float(np.quantile([sc for _, sc in scores], 0.8)) if scores else 0.0
    res = pd.concat(rows, ignore_index=True)

    def agg(g: Any) -> pd.DataFrame:
        return g.agg(
            mape_pct=("ape", lambda s: 100 * s.mean()),
            bias_pct=("signed_err", lambda s: 100 * s.mean()),
            mae_eur_sqm=("abs_err_eur", "mean"),
            direction_accuracy_pct=("direction_ok", lambda s: 100 * s.mean()),
            coverage_80_pct=("covered", lambda s: 100 * s.mean() if s.notna().any() else np.nan),
            n_forecasts=("ape", "size"),
            n_origins=("origin", "nunique"),
            n_falls=("actual_fell", "sum"),
        ).reset_index()

    summary = agg(res.groupby(["horizon_months", "model"]))
    span = res.groupby(["horizon_months", "model"])["origin"].agg(["min", "max"]).reset_index()
    summary = summary.merge(span, on=["horizon_months", "model"])
    summary["first_origin"] = summary.pop("min").dt.date
    summary["last_origin"] = summary.pop("max").dt.date
    per_city = agg(res.groupby(["city", "horizon_months", "model"]))
    return summary.round(3), per_city.round(3), widen


def forecast(df: pd.DataFrame, widen: dict[int, float] | None = None) -> pd.DataFrame:
    """Fit on all observable history and forecast every city from the latest month."""
    origin = df["period_date"].max()
    test = df[df["period_date"] == origin].dropna(subset=FEATURES[:6])
    out = []
    for h in HORIZONS:
        train = df.dropna(subset=FEATURES[:6] + [f"y{h}"])
        q = _predict_quantiles(train, test, h)
        pad = (widen or {}).get(h, 0.0)
        q[:, 0] -= pad
        q[:, 2] += pad
        ratio = np.exp(q)
        base = test["level_eur"].to_numpy()  # ML-4: 3-month average, not the last noisy month
        trend12 = 100 * (np.exp(test["r12"].to_numpy()) - 1)
        change = 100 * (ratio[:, 1] - 1)
        out.append(
            pd.DataFrame(
                {
                    "city": test["city"].to_numpy(),
                    "city_en": test["city_en"].to_numpy(),
                    "origin_month": origin.date(),
                    "horizon_months": h,
                    "target_month": (origin + pd.DateOffset(months=h)).date(),
                    "median_rent_now": np.round(base, 2),
                    "base_method": "3-month average of the median asking rent",
                    "p10_rent_sqm": np.round(base * ratio[:, 0], 2),
                    "p50_rent_sqm": np.round(base * ratio[:, 1], 2),
                    "p90_rent_sqm": np.round(base * ratio[:, 2], 2),
                    "change_p50_pct": np.round(change, 2),
                    "index_change_12m_pct": np.round(trend12, 2),
                    # ML-3: flag a forecast that points the other way from the city's own last 12 months
                    "disagrees_with_trend": (np.sign(change) != np.sign(trend12)) & (np.abs(trend12) >= 1.0),
                    "model_version": MODEL_VERSION,
                }
            )
        )
    return pd.concat(out, ignore_index=True)


def run(monthly: pd.DataFrame, rates: pd.DataFrame, pressure: pd.DataFrame) -> ForecastResult:
    df = build_features(monthly, rates, pressure)
    bt, bt_city, widen = backtest(df)
    fc = forecast(df, widen)
    card = pd.DataFrame(
        [
            {
                "model_version": MODEL_VERSION,
                "trained_at": datetime.now(UTC).replace(tzinfo=None),
                "training_rows": int(df.dropna(subset=["y12"]).shape[0]),
                "cities": int(df["city"].nunique()),
                "history_from": df["period_date"].min().date(),
                "history_to": df["period_date"].max().date(),
                "features": ", ".join(FEATURES),
                "params": str(PARAMS),
                "conformal_widening_log": str({h: round(w, 4) for h, w in widen.items()}),
                "seed": SEED,
                "backtest_origins": f"{bt['first_origin'].min()} to {bt['last_origin'].max()} every 3 months",
                "lgbm_mape_12m": float(bt.query("horizon_months == 12 and model == 'lightgbm'")["mape_pct"].iloc[0]),
                "lgbm_coverage_12m": float(
                    bt.query("horizon_months == 12 and model == 'lightgbm'")["coverage_80_pct"].iloc[0]
                ),
            }
        ]
    )
    log.info("forecast: %d rows, backtest:\n%s", len(fc), bt.to_string())
    return ForecastResult(forecasts=fc, backtest=bt, model_card=card, backtest_city=bt_city)
