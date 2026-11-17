# 0011. Honest forecasts and estimates (audit ML-1 to ML-10)

Date: 2026-11-12
Status: Accepted (amends 0005)

## Context

The audit found that the methods were correct but several headline numbers said more than they could:
the asking-rent "premium" compared unlike things, 363 district rents were extrapolated without any test, every
city was forecast to rise, forecasts were scaled from one noisy month, and anomaly flags were mostly noise in
the raw median.

## Decision

1. **Wording.** The 2026 median asking rent vs. 2022 mean contract rent is called "asking rent vs. 2022 leases"
   and is always explained as a gap between two measures, not a price change.
2. **Validate the district estimate.** `gold.fct_asking_estimate_validation` estimates each GREIX city from the
   other cities (leave-one-out) with the same rule used for the 363 modelled districts. The 80th-percentile
   absolute error (10 % in November 2026) becomes a ± range on every modelled estimate, and the map marks
   measured districts.
3. **Full-history back-test.** Origins every quarter from 2015 (not the last three years), reporting error,
   bias, direction accuracy and coverage, overall and per city. The city identifier was removed as a feature:
   accuracy stayed the same and Berlin's forecast no longer reflects its past boom (+7.4 % → +5.9 %).
4. **Name the limit.** 2012-2026 has 18 falls in 1,406 twelve-month outcomes, so the model rarely predicts a fall.
   The site says so, and flags forecasts that point against a city's own last 12 months.
5. **Smoothed base and target months.** Forecasts apply to a 3-month average of the median and are labelled
   with the month they are for and the data month they start from.
6. **Anomalies on the index, with persistence.** Moves are measured on the hedonic index and kept only if the
   next month does not undo more than half of them (91 → 52 flags).
7. **Grounded text, checked for meaning.** Percentages must match percentage facts; ordinals must equal the
   rank; the direction of the yearly change must match. Summaries are regenerated only when the facts change.
8. **Lineage.** Fixed seed, deterministic training, model card with back-test results, and every published
   forecast appended to `data/history/forecasts.csv` for live accuracy later.

## Consequences

- Some figures look less impressive (wider ranges, flags), but each one now says what it is.
- Model quality is a gate in the weekly refresh, not a unit test in code CI.
- Not yet done: checking the district estimates against an independent district-level asking-rent source (the
  open ones are listing portals, excluded by ADR 0002), and replacing the Land-median premium with a regression on
  district features (income, density, vacancy, distance to the nearest GREIX city). Both are the next model steps.
