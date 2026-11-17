"""Build a throwaway warehouse once per test session: bronze (ingest) -> silver/gold (dbt)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def warehouse(tmp_path_factory) -> str:
    """A full warehouse. Set IMMODASH_TEST_WAREHOUSE to reuse one that is already built (the weekly refresh
    runs the model-quality tests against the warehouse it has just produced)."""
    existing = os.getenv("IMMODASH_TEST_WAREHOUSE")
    if existing:
        os.environ["WAREHOUSE_URL"] = existing
        return existing
    db = tmp_path_factory.mktemp("wh") / "test.duckdb"
    url = f"duckdb:///{db}"
    from immodash_ingest.pipeline import run

    run(offline=True, warehouse_url=url)
    env = {**os.environ, "DUCKDB_PATH": str(db), "DBT_TARGET": "dev"}
    dbt = Path(sys.executable).with_name("dbt")  # the dbt installed next to this Python, even without an activated venv
    proc = subprocess.run(
        [str(dbt) if dbt.exists() else "dbt", "build", "--profiles-dir", ".", "--exclude", "tag:freshness"],
        cwd=ROOT / "dbt",
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stdout[-3000:]
    os.environ["WAREHOUSE_URL"] = url
    ml = subprocess.run(
        [sys.executable, "-m", "ml"], cwd=ROOT, env={**os.environ, "WAREHOUSE_URL": url}, capture_output=True, text=True
    )
    assert ml.returncode == 0, ml.stderr[-3000:]
    return url


@pytest.fixture(scope="session")
def api_client(warehouse):
    from fastapi.testclient import TestClient

    from api import db
    from api.main import app

    db._engine = None  # rebind to the test warehouse
    return TestClient(app)
