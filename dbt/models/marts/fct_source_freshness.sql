-- Gold: how recent the *content* of every source is (DE-1). One row per source.
-- `_loaded_at` in bronze only says when a run loaded the file, so recency is measured on the data itself:
-- the newest period a source contains, compared with how often that source publishes.
-- Tested by tests/assert_sources_not_stale*.sql (tag: freshness, run by the weekly refresh, not by code CI).
with periods as (
    select 'greix_rents' as source_key, 'GREIX asking rents (monthly)' as dataset,
           max(period_date) as data_through, 'quarterly release' as cadence, 150 as warn_after_days, 200 as error_after_days
    from {{ ref('stg_greix__city_rents') }} where frequency = 'monthly'
    union all
    select 'greix_rent_vs_sales', 'GREIX rent vs. sales index (quarterly)',
           max(make_date(year, (quarter - 1) * 3 + 1, 1)), 'irregular (last update Q2 2025)', 240, null
    from {{ source('bronze', 'greix_rent_vs_sales') }}
    union all
    select 'bundesbank_mortgage_rate', 'Bundesbank rate on new housing loans',
           max(period_date), 'monthly', 75, 120
    from {{ ref('stg_bundesbank__mortgage_rate') }}
    union all
    select 'vgrdl_income', 'Regional disposable income (VGRdL)',
           make_date(max(year), 12, 31), 'annual edition each summer', 900, 1250
    from {{ ref('stg_vgrdl__regional_accounts') }} where disposable_income_per_resident_eur is not null
    union all
    select 'zensus', 'Zensus 2022 tables and grid', make_date(2022, 5, 15), 'static (census reference date)', null, null
    union all
    select 'osm_postcodes', 'OpenStreetMap postcode areas (release 2026.02)', make_date(2026, 2, 1), 'a few releases a year', 400, null
    union all
    select 'geo_kreise', 'BKG VG5000 district boundaries', make_date(2021, 1, 1), 'static vintage (1 Jan 2021)', null, null
)
select
    source_key,
    dataset,
    data_through,
    cadence,
    warn_after_days,
    error_after_days,
    {{ dbt.datediff("data_through", "current_date", "day") }}                         as age_days,
    coalesce({{ dbt.datediff("data_through", "current_date", "day") }} > warn_after_days, false)  as is_late,
    coalesce({{ dbt.datediff("data_through", "current_date", "day") }} > error_after_days, false) as is_stale
from periods
