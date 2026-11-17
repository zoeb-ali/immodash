"""Declared schema of every bronze table (DE-4): the columns each parser must produce, their kind, and
simple value rules. A parser that silently renames or mistypes a column fails here, before anything is loaded.

Kept dependency-free on purpose (a few dozen lines instead of pandera); the checks are the same idea:
required columns, dtype kind, non-null keys and value ranges.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


class SchemaError(ValueError):
    pass


@dataclass(frozen=True)
class Col:
    kind: str  # "str" | "num" | "int" | "bool" | "date"
    nullable: bool = True
    min: float | None = None
    max: float | None = None
    pattern: str | None = None


AGS = Col("str", nullable=False, pattern=r"^\d{5}$")
RENT = Col("num", min=1, max=60)

SCHEMAS: dict[str, dict[str, Col]] = {
    "zensus_rent_by_rooms": {
        "reference_date": Col("date", False),
        "ags": AGS,
        "kreis_name": Col("str", False),
        "rooms": Col("str", False),
        "rent_eur_sqm": RENT,
        "quality_flag": Col("str"),
    },
    "zensus_vacancy": {
        "reference_date": Col("date", False),
        "ags": AGS,
        "kreis_name": Col("str", False),
        "market_active_vacancy_pct": Col("num", min=0, max=40),
    },
    "zensus_rent_by_size": {
        "reference_date": Col("date", False),
        "ags": AGS,
        "size_band_code": Col("str", False),
        "sqm_from": Col("num"),
        "sqm_to": Col("num"),
        "rent_eur_sqm": RENT,
    },
    "zensus_bezirke_rent": {
        "reference_date": Col("date", False),
        "bezirk_code": Col("str", False),
        "bezirk_name": Col("str", False),
        "ags": AGS,
        "rent_eur_sqm": RENT,
    },
    "zensus_grid_rent_1km": {
        "grid_id": Col("str", False),
        "x": Col("int", False),
        "y": Col("int", False),
        "rent_eur_sqm": RENT,
        "low_reliability": Col("bool"),
        "ags": AGS,
        "resolution_m": Col("int", False, 1000, 1000),
    },
    "zensus_grid_rent_100m": {
        "grid_id": Col("str", False),
        "x": Col("int", False),
        "y": Col("int", False),
        "rent_eur_sqm": RENT,
        "low_reliability": Col("bool"),
        "ags": AGS,
        "resolution_m": Col("int", False, 100, 100),
        "plz": Col("str", pattern=r"^\d{5}$"),
    },
    "geo_kreise_outline_3035": {"ags": AGS, "outline_3035_geojson": Col("str", False)},
    "vgrdl_income_population": {
        "region_key": Col("str", False),
        "year": Col("int", False, 1990, 2100),
        "value": Col("num"),
        "metric": Col("str", False),
        "unit": Col("str"),
    },
    "greix_city_rents": {
        "year": Col("int", False, 1990, 2100),
        "city": Col("str", False),
        "rent_index": Col("num", min=10, max=1000),
        "median_rent_sqm": Col("num", min=1, max=60),
        "frequency": Col("str", False),
    },
    "greix_rent_vs_sales": {
        "year": Col("int", False, 1990, 2100),
        "quarter": Col("int", True, 1, 4),
        "city": Col("str", False),
        "rent_index": Col("num"),
        "sales_index": Col("num"),
    },
    "bundesbank_mortgage_rate": {"period": Col("date", False), "rate_pct": Col("num", False, -2, 25)},
    "geo_kreise": {"ags": AGS, "name": Col("str", False), "geometry_geojson": Col("str", False)},
}

_KIND = {
    "str": lambda s: pd.api.types.is_string_dtype(s) or pd.api.types.is_object_dtype(s),
    "num": pd.api.types.is_numeric_dtype,
    "int": pd.api.types.is_integer_dtype,
    "bool": lambda s: pd.api.types.is_bool_dtype(s) or pd.api.types.is_object_dtype(s),
    "date": lambda s: pd.api.types.is_datetime64_any_dtype(s) or pd.api.types.is_object_dtype(s),
}


def check_schema(table: str, df: pd.DataFrame) -> None:
    """Raise SchemaError listing every problem found in `df` for the declared bronze `table`."""
    spec = SCHEMAS.get(table)
    if spec is None:
        raise SchemaError(f"no schema declared for bronze.{table}; add it to immodash_ingest/schemas.py")
    errors: list[str] = []
    for name, col in spec.items():
        if name not in df.columns:
            errors.append(f"missing column {name}")
            continue
        s = df[name]
        if not _KIND[col.kind](s):
            errors.append(f"{name}: expected {col.kind}, got {s.dtype}")
            continue
        if not col.nullable and s.isna().any():
            errors.append(f"{name}: {int(s.isna().sum())} nulls in a required column")
        nn = s.dropna()
        if col.kind in ("num", "int") and len(nn):
            if col.min is not None and (nn < col.min).any():
                errors.append(f"{name}: {int((nn < col.min).sum())} values below {col.min}")
            if col.max is not None and (nn > col.max).any():
                errors.append(f"{name}: {int((nn > col.max).sum())} values above {col.max}")
        if col.pattern and len(nn):
            bad = ~nn.astype(str).str.match(col.pattern)
            if bad.any():
                errors.append(f"{name}: {int(bad.sum())} values not matching {col.pattern}, e.g. {nn[bad].iloc[0]!r}")
    if errors:
        raise SchemaError(f"bronze.{table}: " + "; ".join(errors))
