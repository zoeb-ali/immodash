"""The publish gate (OPS-1) rejects an incomplete or implausible snapshot."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import validate_snapshot  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "web" / "public" / "data"


def test_committed_snapshot_passes():
    assert validate_snapshot.validate(DATA) == []


def test_missing_file_is_reported(tmp_path):
    (tmp_path / "meta.json").write_text("{}")
    errors = validate_snapshot.validate(tmp_path)
    assert any("missing cities.json" in e for e in errors)


def test_absurd_forecast_is_caught(tmp_path):
    for p in DATA.rglob("*.json"):
        target = tmp_path / p.relative_to(DATA)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(p.read_bytes())
    fc = json.loads((tmp_path / "forecasts.json").read_text())
    fc[0]["change_p50_pct"] = 80.0
    (tmp_path / "forecasts.json").write_text(json.dumps(fc))
    assert any("change_p50_pct outside" in e for e in validate_snapshot.validate(tmp_path))
