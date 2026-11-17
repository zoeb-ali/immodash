-- DE-1: fails the weekly refresh when a regularly published source is far behind its release cadence.
{{ config(tags=['freshness'], severity='error') }}
select source_key, data_through, age_days, error_after_days
from {{ ref('fct_source_freshness') }}
where is_stale
