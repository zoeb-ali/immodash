"""Bronze schema contracts (DE-4)."""

from __future__ import annotations

import pandas as pd
import pytest

from immodash_ingest.schemas import SchemaError, check_schema


def _vacancy(**over):
    df = pd.DataFrame(
        {
            "reference_date": pd.to_datetime(["2022-05-15"] * 2),
            "ags": ["05711", "11000"],
            "kreis_name": ["Bielefeld", "Berlin"],
            "market_active_vacancy_pct": [1.7, 1.3],
        }
    )
    for k, v in over.items():
        df[k] = v
    return df


def test_valid_frame_passes():
    check_schema("zensus_vacancy", _vacancy())


def test_missing_column_and_bad_values_are_reported_together():
    df = _vacancy(ags=["5711", "11000"], market_active_vacancy_pct=[1.7, 55.0]).drop(columns="kreis_name")
    with pytest.raises(SchemaError) as e:
        check_schema("zensus_vacancy", df)
    msg = str(e.value)
    assert "missing column kreis_name" in msg and "not matching" in msg and "above 40" in msg


def test_wrong_dtype():
    with pytest.raises(SchemaError, match="expected num"):
        check_schema("zensus_vacancy", _vacancy(market_active_vacancy_pct=["1,7", "1,3"]))


def test_undeclared_table():
    with pytest.raises(SchemaError, match="no schema declared"):
        check_schema("something_new", _vacancy())
