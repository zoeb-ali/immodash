-- DE-1: warns (does not fail) when a source is later than usual, so a slipping release is visible early.
{{ config(tags=['freshness'], severity='warn') }}
select source_key, data_through, age_days, warn_after_days
from {{ ref('fct_source_freshness') }}
where is_late
