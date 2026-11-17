"""Typed response contracts for the read API."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class _Model(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CitySnapshot(_Model):
    city: str
    city_en: str
    ags: str
    mapping_type: str
    land_name: str | None
    latest_month: date
    median_rent_sqm: float = Field(description="Median asking rent, EUR/m² (GREIX)")
    p25_rent_sqm: float | None
    p75_rent_sqm: float | None
    index_yoy_pct: float | None
    index_5y_pct: float | None
    existing_contract_rent_sqm_2022: float | None = Field(description="Zensus 2022 average rent")
    asking_premium_vs_existing_pct: float | None
    income_year: int | None
    disposable_income_per_resident_eur: float | None
    population: float | None
    reference_monthly_rent_eur: float | None
    asking_rent_burden_pct: float | None
    time_on_market_days_4q: float | None
    share_closed_within_week_4q: float | None
    demand_pressure_score: float | None
    pressure_quarter: date | None
    sales_to_rent_index_ratio: float | None


class CityRentPoint(_Model):
    city: str
    city_en: str
    period_date: date
    median_rent_sqm: float | None
    avg_rent_sqm: float | None
    p25_rent_sqm: float | None
    p75_rent_sqm: float | None
    nominal_rent_index: float | None
    real_rent_index: float | None
    median_mom_pct: float | None
    index_yoy_pct: float | None


class MarketPressurePoint(_Model):
    city: str
    city_en: str
    period_date: date
    median_rent_sqm: float | None
    time_on_market_days_4q: float | None
    share_closed_within_week_4q: float | None
    demand_pressure_score: float | None


class KreisAffordability(_Model):
    ags: str
    kreis_name: str
    land_name: str | None
    is_urban_district: bool
    rent_eur_sqm: float
    income_year: int
    disposable_income_per_resident_eur: float
    population: float | None
    reference_monthly_rent_eur: float
    rent_burden_pct: float
    affordability_index: float
    income_cagr_5y_pct: float | None
    affordability_rank: int


class KreisRent(_Model):
    ags: str
    kreis_name: str
    rooms: str
    rent_eur_sqm: float
    national_mean_rent_eur_sqm: float
    rent_index_vs_national: float
    rank_most_expensive: int


class KreisAskingRent(_Model):
    ags: str
    kreis_name: str
    rooms: str
    rent_eur_sqm: float = Field(description="Zensus 2022 existing-contract rent, EUR/m²")
    national_mean_rent_eur_sqm: float
    estimated_asking_rent_eur_sqm: float
    asking_premium: float
    estimate_method: str
    is_modelled: bool = Field(description="True when the district has no listing data and the value is modelled")
    estimate_low_eur_sqm: float | None = Field(
        None, description="Lower end of the modelled range (validation error band)"
    )
    estimate_high_eur_sqm: float | None = Field(None, description="Upper end of the modelled range")


class MortgageRatePoint(_Model):
    period_date: date
    rate_pct: float
    change_12m_pp: float | None
    monthly_payment_reference_loan_eur: float


class FinderResult(_Model):
    ags: str
    kreis_name: str
    land_name: str | None
    rent_eur_sqm: float = Field(description="Zensus 2022 existing-contract rent, EUR/m²")
    estimated_asking_rent_eur_sqm: float
    estimate_method: str
    estimated_monthly_rent_eur: float
    headroom_eur: float
    affordability_index: float
    population: float | None


class SourceInfo(_Model):
    key: str
    publisher: str
    licence: str
    url: str | None
    licence_url: str | None = None
    release_note: str = ""


class SourceFreshness(_Model):
    source_key: str
    dataset: str
    data_through: date = Field(description="Newest period contained in the source")
    cadence: str
    warn_after_days: int | None
    error_after_days: int | None
    age_days: int
    is_late: bool
    is_stale: bool


class EstimateValidation(_Model):
    city: str
    ags: str
    method: str
    actual_asking_rent_eur_sqm: float
    estimated_asking_rent_eur_sqm: float
    error_pct: float


# ---------------------------------------------------------------- Phase 2
class KreisRentBySize(_Model):
    ags: str
    kreis_name: str
    size_band_code: str
    size_band_label: str
    sqm_from: int
    sqm_to: int | None
    rent_eur_sqm: float
    national_mean_rent_eur_sqm: float
    estimated_asking_rent_eur_sqm: float | None
    estimate_method: str | None


class KreisSupplyDemand(_Model):
    ags: str
    kreis_name: str
    land_name: str | None
    is_urban_district: bool
    market_active_vacancy_pct: float
    population: float | None
    population_growth_5y_pct: float
    income_growth_5y_pct: float | None
    supply_demand_index: float
    market_balance: str
    rent_eur_sqm: float | None


class CitySupplyDemand(_Model):
    city: str
    city_en: str
    ags: str
    market_active_vacancy_pct: float | None
    population_growth_5y_pct: float | None
    supply_demand_index: float | None
    market_balance: str | None
    time_on_market_days_4q: float | None
    share_closed_within_week_4q: float | None
    demand_pressure_score: float | None
    index_yoy_pct: float | None
    median_rent_sqm: float | None


class NeighbourhoodSpread(_Model):
    ags: str
    cells: int
    p10_rent_eur_sqm: float
    p50_rent_eur_sqm: float
    p90_rent_eur_sqm: float
    p90_p10_ratio: float | None


class KreisRentRange(_Model):
    """Spread of rents inside a Kreis: cheaper and dearer ends relative to the median (= 100)."""

    ags: str
    resolution_m: int
    cells: int
    p10_rent_eur_sqm: float
    p50_rent_eur_sqm: float
    p90_rent_eur_sqm: float
    p10_index: float
    p90_index: float


class PostcodeRent(_Model):
    """Rent level of one postcode (PLZ) in a GREIX-city Kreis, from 100 m Zensus grid cells (2022)."""

    ags: str
    plz: str
    cells: int
    p25_rent_eur_sqm: float
    p50_rent_eur_sqm: float
    p75_rent_eur_sqm: float
    rent_index_vs_kreis: float


class GridCells(_Model):
    """Column-oriented grid payload (compact for ~30k cells)."""

    ags: str
    resolution_m: int
    crs: str = "EPSG:3035"
    x: list[int]
    y: list[int]
    rent_eur_sqm: list[float]
    low_reliability: list[bool]
    outline_3035: dict | None


class BezirkRent(_Model):
    city: str
    bezirk_code: str
    bezirk_name: str
    rent_eur_sqm: float
    city_rent_eur_sqm: float
    vs_city_pct: float
    rank_in_city: int


# ---------------------------------------------------------------- Phase 3
class RentForecast(_Model):
    city: str
    city_en: str
    origin_month: date
    horizon_months: int
    target_month: date
    median_rent_now: float
    p10_rent_sqm: float
    p50_rent_sqm: float
    p90_rent_sqm: float
    change_p50_pct: float
    base_method: str = Field(description="What median_rent_now is: a 3-month average of the median asking rent")
    index_change_12m_pct: float | None = Field(description="Change of the hedonic index over the last 12 months")
    disagrees_with_trend: bool = Field(description="Forecast direction differs from the last 12 months' trend")
    model_version: str


class BacktestRow(_Model):
    horizon_months: int
    model: str
    mape_pct: float
    bias_pct: float = Field(description="Mean signed error; positive = forecasts were too high")
    mae_eur_sqm: float
    direction_accuracy_pct: float = Field(description="Share of forecasts that got rise vs. fall right")
    coverage_80_pct: float | None
    n_forecasts: int
    n_origins: int
    n_falls: int = Field(description="How many of the real outcomes were falls of more than 0.5 %")
    first_origin: date
    last_origin: date


class BacktestCityRow(_Model):
    city: str
    horizon_months: int
    model: str
    mape_pct: float
    bias_pct: float
    mae_eur_sqm: float
    direction_accuracy_pct: float
    coverage_80_pct: float | None
    n_forecasts: int
    n_origins: int
    n_falls: int


class RentAnomaly(_Model):
    city: str
    city_en: str
    period_date: date
    median_rent_sqm: float
    mom_pct: float
    market_mom_pct: float
    excess_pct: float
    robust_z: float
    is_anomaly: bool
    direction: str
    severity: str
    persistence: str = Field(description="persisted | reversed | pending (next month not yet known)")
    signal: str = Field(description="Series the move was measured on")


class MarketSummary(_Model):
    city: str
    text: str
    text_de: str = Field(description="German template summary (the LLM text is English only)")
    generated_by: str
    facts_hash: str = Field(description="Hash of the facts; the text is regenerated only when it changes")
    grounding_rejected_numbers: list[str]
    generated_at: datetime
    facts: dict
