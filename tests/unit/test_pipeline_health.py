"""Ingest health checks (DE-1, DE-2, DE-4): fallbacks are counted, logged and eventually fail the run."""

from __future__ import annotations

import pandas as pd
import pytest

from immodash_ingest import pipeline
from immodash_ingest.pipeline import Acquired, _fallback_streaks


def test_fallback_streak_counts_consecutive_runs():
    history = [{"source": "greix_rents", "status": s} for s in ["downloaded", "fallback", "fallback"]]
    a = [Acquired("greix_rents", None, "fallback"), Acquired("bundesbank_mortgage_rate", None, "downloaded")]
    _fallback_streaks(a, history)
    assert a[0].fallback_streak == 3 and a[1].fallback_streak == 0


def test_streak_resets_after_a_success():
    history = [{"source": "s", "status": s} for s in ["fallback", "fallback", "downloaded"]]
    a = [Acquired("s", None, "fallback")]
    _fallback_streaks(a, history)
    assert a[0].fallback_streak == 1


@pytest.fixture
def tiny_pipeline(tmp_path, monkeypatch):
    """One fake source and job, so run() can be exercised without the real files or network."""
    raw = tmp_path / "raw.csv"
    raw.write_text("x")
    state = {"status": "fallback", "rows": 10}

    def fake_acquire(source, offline):
        return Acquired(source.key, raw, state["status"], "abc", 1, error="ConnectionError: boom")

    def parser(_):
        return pd.DataFrame(
            {"period": pd.to_datetime(["2026-01-01"] * state["rows"]), "rate_pct": [3.0] * state["rows"]}
        )

    monkeypatch.setattr(pipeline, "acquire", fake_acquire)
    monkeypatch.setattr(
        pipeline, "JOBS", [pipeline.Job("bundesbank_mortgage_rate", "bundesbank_mortgage_rate", parser)]
    )
    monkeypatch.setattr(pipeline, "load_bronze", lambda df, table, **k: len(df))
    monkeypatch.setattr(pipeline, "HISTORY_DIR", tmp_path / "history")
    monkeypatch.setenv("IMMODASH_MAX_FALLBACK_RUNS", "3")
    return state, tmp_path / "history"


def test_run_fails_after_repeated_fallbacks(tiny_pipeline):
    state, hist = tiny_pipeline
    pipeline.run(record=True)
    pipeline.run(record=True)
    with pytest.raises(pipeline.IngestHealthError, match="cached copy for 3 runs"):
        pipeline.run(record=True)
    log = pd.read_csv(hist / "ingest_log.csv")
    assert list(log["fallback_streak"]) == [1, 2, 3] and set(log["status"]) == {"fallback"}


def test_run_fails_on_large_row_drop(tiny_pipeline):
    state, hist = tiny_pipeline
    state["status"] = "downloaded"
    pipeline.run(record=True)
    state["rows"] = 5
    with pytest.raises(pipeline.IngestHealthError, match="dropped -50.0"):
        pipeline.run(record=True)


def test_offline_runs_do_not_record(tiny_pipeline):
    state, hist = tiny_pipeline
    pipeline.run(offline=True)
    assert not (hist / "ingest_log.csv").exists()
