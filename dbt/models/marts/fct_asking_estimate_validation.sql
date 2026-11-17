-- Gold: leave-one-out validation of the district asking-rent estimate (audit ML-2). One row per GREIX city.
-- For 363 of 400 districts there is no listing data, so their asking rent is the Zensus 2022 rent raised by
-- the median premium of the GREIX cities in the same Land (else the national median). To measure how good
-- that rule is, we pretend each GREIX city had no listing data, estimate it from the *other* cities with
-- exactly the same rule, and compare with its real GREIX median asking rent.
-- Limitation: the test cities are all large; rural districts may be estimated less well than this shows.
with c as (
    select city, ags, left(ags, 2) as land_code, median_rent_sqm,
           existing_contract_rent_sqm_2022, asking_premium_vs_existing_pct / 100.0 as premium
    from {{ ref('fct_city_snapshot') }}
    where existing_contract_rent_sqm_2022 is not null
),
loo as (
    select
        c.city, c.ags, c.land_code, c.median_rent_sqm, c.existing_contract_rent_sqm_2022,
        (select percentile_cont(0.5) within group (order by o.premium)
           from c o where o.land_code = c.land_code and o.city <> c.city)         as land_premium,
        (select percentile_cont(0.5) within group (order by o.premium)
           from c o where o.city <> c.city)                                         as national_premium
    from c
)
select
    city,
    ags,
    case when land_premium is not null then 'greix_land_median' else 'greix_national_median' end as method,
    median_rent_sqm                                                                as actual_asking_rent_eur_sqm,
    round(cast(existing_contract_rent_sqm_2022 * (1 + coalesce(land_premium, national_premium)) as numeric), 2)
                                                                                   as estimated_asking_rent_eur_sqm,
    round(cast(100 * (existing_contract_rent_sqm_2022 * (1 + coalesce(land_premium, national_premium))
                      / median_rent_sqm - 1) as numeric), 1)                       as error_pct
from loo
