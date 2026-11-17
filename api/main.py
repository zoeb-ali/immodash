"""ImmoDash read API - typed endpoints over the gold layer.

Every route is served under /v1 (the versioned contract) and, for backward compatibility with the static
export and old links, without a prefix (hidden from the OpenAPI schema). Responses carry Cache-Control
headers: the data changes at most once a week.

Before hosting this publicly (it is not hosted today; the site is a static export), also put a rate limiter
in front of it (for example the platform's edge rules), see docs/RUNBOOK.md and audit SEC-5.
"""

from __future__ import annotations

import json
import os
from datetime import date
from functools import lru_cache
from typing import Annotated, Literal

from fastapi import APIRouter, FastAPI, HTTPException, Path, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from immodash_ingest.config import SOURCES

from . import db
from . import summary as summary_mod
from .schemas import (
    BacktestCityRow,
    BacktestRow,
    BezirkRent,
    CityRentPoint,
    CitySnapshot,
    CitySupplyDemand,
    EstimateValidation,
    FinderResult,
    GridCells,
    KreisAffordability,
    KreisAskingRent,
    KreisRent,
    KreisRentBySize,
    KreisRentRange,
    KreisSupplyDemand,
    MarketPressurePoint,
    MarketSummary,
    MortgageRatePoint,
    NeighbourhoodSpread,
    PostcodeRent,
    RentAnomaly,
    RentForecast,
    SourceFreshness,
    SourceInfo,
)

try:
    from importlib.metadata import version as _version

    API_VERSION = _version("immodash")
except Exception:  # noqa: BLE001 - source checkout without `pip install -e .`
    API_VERSION = "0+local"

app = FastAPI(
    title="ImmoDash API",
    version=API_VERSION,
    description="German rental market intelligence: asking rents, Zensus 2022 rents, "
    "income-based affordability and financing costs.",
)
# SEC-5: no wildcard by default; set CORS_ORIGINS="*" explicitly for a fully public API.
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "https://immodash-virid.vercel.app").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["GET"], allow_headers=["*"])
CACHE_SECONDS = int(os.getenv("API_CACHE_SECONDS", "3600"))


@app.middleware("http")
async def cache_headers(request: Request, call_next):
    """SWE-5: data changes weekly, so every successful GET may be cached by browsers and CDNs."""
    response = await call_next(request)
    if request.method == "GET" and response.status_code == 200 and "cache-control" not in response.headers:
        response.headers["Cache-Control"] = (
            "no-store" if request.url.path.endswith("/health") else f"public, max-age={CACHE_SECONDS}"
        )
    return response


router = APIRouter()
Rooms = Literal["total", "1", "2", "3", "4", "5", "6", "7+"]
# SEC-6: one validated type for Kreis keys and for floor-area bands everywhere
Ags = Annotated[str, Path(pattern=r"^\d{5}$", description="5-digit Amtlicher Gemeindeschlüssel of a Kreis")]
AgsQuery = Annotated[str | None, Query(pattern=r"^\d{5}$", description="5-digit Kreis key")]
SizeBand = Literal[
    "WFL000B039",
    "WFL040B059",
    "WFL060B079",
    "WFL080B099",
    "WFL100B119",
    "WFL120B139",
    "WFL140B159",
    "WFL160B179",
    "WFL180B199",
    "WFL200BXXX",
]


def cols(model: type[BaseModel], prefix: str = "") -> str:
    """SWE-4: select exactly the columns a response model declares, so a renamed or dropped column fails in SQL
    with a clear error instead of being discovered later (or never) by Pydantic."""
    return ", ".join(f"{prefix}{name}" for name in model.model_fields)


@router.get("/health")
def health() -> dict[str, str]:
    db.fetch_all("select 1 as ok")
    return {"status": "ok"}


@router.get("/meta/sources", response_model=list[SourceInfo])
def sources() -> list[SourceInfo]:
    return [
        SourceInfo(
            key=s.key,
            publisher=s.publisher,
            licence=s.licence,
            url=s.url,
            licence_url=s.licence_url,
            release_note=s.release_note,
        )
        for s in SOURCES.values()
    ]


@router.get("/meta/freshness", response_model=list[SourceFreshness])
def freshness() -> list[dict]:
    """How recent the content of each source is, against its release cadence (DE-1)."""
    return db.fetch_all(f"select {cols(SourceFreshness)} from gold.fct_source_freshness order by source_key")


@router.get("/validation/asking-estimate", response_model=list[EstimateValidation])
def asking_estimate_validation() -> list[dict]:
    """Leave-one-out test of the district asking-rent estimate on the 37 GREIX cities (ML-2)."""
    return db.fetch_all(
        f"select {cols(EstimateValidation)} from gold.fct_asking_estimate_validation order by error_pct"
    )


@router.get("/cities", response_model=list[CitySnapshot])
def cities() -> list[dict]:
    return db.fetch_all(f"select {cols(CitySnapshot)} from gold.fct_city_snapshot order by median_rent_sqm desc")


@router.get("/rents/monthly", response_model=list[CityRentPoint])
def rents_monthly(
    cities: list[str] = Query(default=[], description="German city names as in /cities; empty = all"),
    start: date | None = Query(default=None, description="First month (inclusive)"),
) -> list[dict]:
    where: list[str] = ["1=1"]
    params: dict[str, object] = {}
    if cities:
        clause, p = db.in_clause("c", cities)
        where.append(f"city in {clause}")
        params.update(p)
    if start:
        where.append("period_date >= :start")
        params["start"] = start
    return db.fetch_all(
        f"select {cols(CityRentPoint)} from gold.fct_city_rent_monthly where {' and '.join(where)} order by city, "
        "period_date",
        params,
    )


@router.get("/market-pressure", response_model=list[MarketPressurePoint])
def market_pressure(cities: list[str] = Query(default=[])) -> list[dict]:
    if cities:
        clause, p = db.in_clause("c", cities)
        return db.fetch_all(
            f"select {cols(MarketPressurePoint)} from gold.fct_city_market_pressure where city in {clause} order "
            "by city, period_date",
            p,
        )
    return db.fetch_all(
        f"select {cols(MarketPressurePoint)} from gold.fct_city_market_pressure order by city, period_date"
    )


@router.get("/kreise/affordability", response_model=list[KreisAffordability])
def kreis_affordability() -> list[dict]:
    return db.fetch_all(
        f"select {cols(KreisAffordability)} from gold.fct_kreis_affordability order by affordability_rank"
    )


@router.get("/kreise/rents", response_model=list[KreisRent])
def kreis_rents(rooms: Rooms = "total") -> list[dict]:
    return db.fetch_all(
        f"select {cols(KreisRent)} from gold.fct_kreis_rent_by_rooms where rooms = :rooms order by rank_most_expensive",
        {"rooms": rooms},
    )


@router.get("/kreise/{ags}/rents", response_model=list[KreisRent])
def kreis_rent_detail(ags: Ags) -> list[dict]:
    rows = db.fetch_all(
        f"select {cols(KreisRent)} from gold.fct_kreis_rent_by_rooms where ags = :ags order by rooms_sort", {"ags": ags}
    )
    if not rows:
        raise HTTPException(404, f"unknown Kreis {ags}")
    return rows


_ASKING_SQL = """
    select e.ags, e.kreis_name, e.rooms, e.existing_rent_eur_sqm as rent_eur_sqm,
           r.national_mean_rent_eur_sqm, e.estimated_asking_rent_eur_sqm, e.asking_premium, e.estimate_method,
           e.is_modelled, e.estimate_low_eur_sqm, e.estimate_high_eur_sqm
    from gold.fct_kreis_asking_rent_estimate e
    join gold.fct_kreis_rent_by_rooms r on r.ags = e.ags and r.rooms = e.rooms
"""


@router.get("/kreise/asking-rents", response_model=list[KreisAskingRent])
def kreis_asking_rents(rooms: Rooms = "total") -> list[dict]:
    """Estimated current asking rent per Kreis (Zensus 2022 x GREIX asking premium)."""
    return db.fetch_all(_ASKING_SQL + " where e.rooms = :rooms order by e.ags", {"rooms": rooms})


@router.get("/kreise/{ags}/asking-rents", response_model=list[KreisAskingRent])
def kreis_asking_rent_detail(ags: Ags) -> list[dict]:
    rows = db.fetch_all(_ASKING_SQL + " where e.ags = :ags order by e.rooms_sort", {"ags": ags})
    if not rows:
        raise HTTPException(404, f"unknown Kreis {ags}")
    return rows


@router.get("/affordability/finder", response_model=list[FinderResult])
def finder(
    budget_eur: float = Query(..., gt=0, description="Max monthly cold rent"),
    sqm: float = Query(60, gt=10, le=250),
    rooms: Rooms = "total",
    size_band: SizeBand | None = Query(None, description="Zensus floor-area band; overrides `rooms` when set"),
    limit: int = Query(25, ge=1, le=400),
) -> list[dict]:
    """Kreise where a flat of `sqm` m² fits the budget at the *estimated current asking rent*
    (Zensus 2022 level uplifted by GREIX asking premia; see fct_kreis_asking_rent_estimate)."""
    if size_band:
        seg_sql = """select ags, kreis_name, rent_eur_sqm as existing_rent_eur_sqm, estimated_asking_rent_eur_sqm,
                            estimate_method from gold.fct_kreis_rent_by_size where size_band_code = :seg"""
        seg: str = size_band
    else:
        seg_sql = """select ags, kreis_name, existing_rent_eur_sqm, estimated_asking_rent_eur_sqm, estimate_method
                     from gold.fct_kreis_asking_rent_estimate where rooms = :seg"""
        seg = rooms
    return db.fetch_all(
        f"""
        with e as ({seg_sql})
        select e.ags, e.kreis_name, a.land_name,
               e.existing_rent_eur_sqm                                                      as rent_eur_sqm,
               e.estimated_asking_rent_eur_sqm,
               e.estimate_method,
               round(cast(e.estimated_asking_rent_eur_sqm * :sqm as numeric), 0) as estimated_monthly_rent_eur,
               round(cast(:budget - e.estimated_asking_rent_eur_sqm * :sqm as numeric), 0) as headroom_eur,
               a.affordability_index,
               a.population
        from e
        join gold.fct_kreis_affordability a on a.ags = e.ags
        where e.estimated_asking_rent_eur_sqm * :sqm <= :budget
        order by a.population desc
        limit :limit
        """,
        {"budget": budget_eur, "sqm": sqm, "seg": seg, "limit": limit},
    )


@router.get("/mortgage-rates", response_model=list[MortgageRatePoint])
def mortgage_rates(start: date | None = None) -> list[dict]:
    if start:
        return db.fetch_all(
            f"select {cols(MortgageRatePoint)} from gold.fct_mortgage_rates where period_date >= :s order by "
            "period_date",
            {"s": start},
        )
    return db.fetch_all(f"select {cols(MortgageRatePoint)} from gold.fct_mortgage_rates order by period_date")


Simplify = Literal["0", "0.003", "0.012"]  # SEC-5: a fixed set, so the cache below can hold every variant


@lru_cache(maxsize=3)
def _kreise_geojson(simplify: float = 0.0) -> dict:
    rows = db.fetch_all("select ags, geo_name, geometry_geojson from silver.stg_geo__kreise")
    feats = []
    for r in rows:
        geom = json.loads(r["geometry_geojson"])
        if simplify > 0:
            import shapely
            from shapely.geometry import mapping, shape

            g = shapely.set_precision(shape(geom).simplify(simplify, preserve_topology=True), 0.0001)
            geom = mapping(g)
        feats.append(
            {
                "type": "Feature",
                "id": r["ags"],
                "properties": {"ags": r["ags"], "name": r["geo_name"]},
                "geometry": geom,
            }
        )
    return {"type": "FeatureCollection", "features": feats}


@router.get("/geo/kreise")
def kreise_geojson(simplify: Simplify = Query("0", description="Douglas-Peucker tolerance in degrees")) -> dict:
    """Kreis polygons (BKG VG5000) as a GeoJSON FeatureCollection keyed by AGS. `simplify=0.003`
    cuts the payload ~4x for web maps; `0.012` is an outline for small maps."""
    return _kreise_geojson(float(simplify))


# ---------------------------------------------------------------- Phase 2: segments, supply/demand, neighbourhoods


@router.get("/kreise/rents-by-size", response_model=list[KreisRentBySize])
def kreis_rents_by_size(
    size_band: SizeBand | None = Query(None, description="Zensus floor-area band code; empty = all bands"),
    ags: AgsQuery = None,
) -> list[dict]:
    where: list[str] = ["1=1"]
    params: dict[str, object] = {}
    if size_band:
        where.append("size_band_code = :b")
        params["b"] = size_band
    if ags:
        where.append("ags = :a")
        params["a"] = ags
    return db.fetch_all(
        f"select {cols(KreisRentBySize)} from gold.fct_kreis_rent_by_size where {' and '.join(where)} order by "
        "ags, sqm_from",
        params,
    )


@router.get("/kreise/supply-demand", response_model=list[KreisSupplyDemand])
def kreis_supply_demand() -> list[dict]:
    return db.fetch_all(
        f"select {cols(KreisSupplyDemand)} from gold.fct_kreis_supply_demand order by supply_demand_index desc"
    )


@router.get("/cities/supply-demand", response_model=list[CitySupplyDemand])
def city_supply_demand() -> list[dict]:
    return db.fetch_all(
        f"select {cols(CitySupplyDemand)} from gold.fct_city_supply_demand order by supply_demand_index desc"
    )


@router.get("/kreise/neighbourhood-spread", response_model=list[NeighbourhoodSpread])
def neighbourhood_spread() -> list[dict]:
    return db.fetch_all(
        f"select {cols(NeighbourhoodSpread)} from gold.fct_kreis_neighbourhood_spread order by p90_p10_ratio desc"
    )


@router.get("/kreise/rent-range", response_model=list[KreisRentRange])
def kreis_rent_range() -> list[dict]:
    """How far rents spread inside each Kreis (10th to 90th percentile of Zensus grid cells)."""
    return db.fetch_all(f"select {cols(KreisRentRange)} from gold.fct_kreis_rent_range order by ags")


@router.get("/postcodes/rents", response_model=list[PostcodeRent])
def postcode_rents(ags: AgsQuery = None) -> list[dict]:
    """Rent level per postcode in the 37 GREIX-city Kreise (postcode areas: OpenStreetMap, ODbL)."""
    if ags:
        rows = db.fetch_all(
            f"select {cols(PostcodeRent)} from gold.fct_postcode_rent where ags = :a order by plz", {"a": ags}
        )
        if not rows:
            raise HTTPException(404, f"no postcode data for Kreis {ags}")
        return rows
    return db.fetch_all(f"select {cols(PostcodeRent)} from gold.fct_postcode_rent order by ags, plz")


@router.get("/kreise/{ags}/grid", response_model=GridCells)
def kreis_grid(ags: Ags, resolution_m: int = Query(100, description="100 or 1000")) -> dict:
    """Zensus grid rents inside a Kreis (100 m only for Kreise containing a GREIX city)."""
    if resolution_m not in (100, 1000):
        raise HTTPException(422, "resolution_m must be 100 or 1000")
    rows = db.fetch_all(
        "select x, y, rent_eur_sqm, low_reliability from gold.fct_grid_rent_cells where ags = :a and resolution_m = :r",
        {"a": ags, "r": resolution_m},
    )
    if not rows:
        raise HTTPException(404, f"no {resolution_m} m grid cells for Kreis {ags}")
    outline = db.fetch_all("select outline_3035_geojson from silver.stg_geo__kreis_outlines where ags = :a", {"a": ags})
    return {
        "ags": ags,
        "resolution_m": resolution_m,
        "x": [r["x"] for r in rows],
        "y": [r["y"] for r in rows],
        "rent_eur_sqm": [float(r["rent_eur_sqm"]) for r in rows],
        "low_reliability": [bool(r["low_reliability"]) for r in rows],
        "outline_3035": json.loads(outline[0]["outline_3035_geojson"]) if outline else None,
    }


@router.get("/bezirke/rents", response_model=list[BezirkRent])
def bezirke_rents() -> list[dict]:
    return db.fetch_all(f"select {cols(BezirkRent)} from gold.fct_bezirk_rent order by city, rank_in_city")


# ---------------------------------------------------------------- Phase 3: forecasts, anomalies, summaries
@router.get("/forecasts", response_model=list[RentForecast])
def forecasts(cities: list[str] = Query(default=[])) -> list[dict]:
    if cities:
        clause, p = db.in_clause("c", cities)
        return db.fetch_all(
            f"select {cols(RentForecast)} from ml.rent_forecast where city in {clause} order by city, horizon_months", p
        )
    return db.fetch_all(f"select {cols(RentForecast)} from ml.rent_forecast order by city, horizon_months")


@router.get("/forecasts/backtest/cities", response_model=list[BacktestCityRow])
def forecast_backtest_cities() -> list[dict]:
    """Backtest error, bias, direction accuracy and coverage per city (ML-3, ML-10)."""
    return db.fetch_all(
        f"select {cols(BacktestCityRow)} from ml.forecast_backtest_city order by city, horizon_months, model"
    )


@router.get("/forecasts/backtest", response_model=list[BacktestRow])
def forecast_backtest() -> list[dict]:
    return db.fetch_all(f"select {cols(BacktestRow)} from ml.forecast_backtest order by horizon_months, mape_pct")


@router.get("/anomalies", response_model=list[RentAnomaly])
def anomalies(
    cities: list[str] = Query(default=[]),
    only_flagged: bool = True,
    start: date | None = None,
) -> list[dict]:
    where: list[str] = ["1=1"]
    params: dict[str, object] = {}
    if cities:
        clause, p = db.in_clause("c", cities)
        where.append(f"city in {clause}")
        params.update(p)
    if only_flagged:
        where.append("is_anomaly")
    if start:
        where.append("period_date >= :s")
        params["s"] = start
    return db.fetch_all(
        f"select {cols(RentAnomaly)} from ml.rent_anomalies where {' and '.join(where)} order by period_date desc",
        params,
    )


@router.get("/cities/{city}/summary", response_model=MarketSummary)
def city_summary(city: str) -> dict:
    """Market summary grounded in the warehouse: the deterministic template (English and German).

    SEC-5: the public route never calls the LLM, so a request cannot trigger a paid, slow upstream call.
    LLM drafts are written only by the weekly export (scripts/export_static.py), reviewed in its pull request."""
    result = summary_mod.summarise(city, use_llm=False)
    if result is None:
        raise HTTPException(404, f"unknown city {city}")
    return result


app.include_router(router, prefix="/v1")
app.include_router(router, include_in_schema=False)  # unversioned aliases kept for the static export and old links
