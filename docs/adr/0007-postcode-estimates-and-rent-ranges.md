# 0007 – Rent ranges and postcode estimates from census grid cells

**Status:** accepted · 2026-10

## Context
The affordability finder showed one estimated rent per district. For a city such as Berlin or Bielefeld that
hides large differences between neighbourhoods (Bielefeld 33602 vs Brackwede), which users noticed and questioned.
No open, current, nationwide source of asking rents below city level exists: GREIX is city level, listing data
(ImmoScout24, VALUE) is licensed, and scraping is ruled out by ADR 0002. The Zensus 2022 grid gives rents on
existing contracts for every 100 m cell in the 37 city districts and every 1 km cell elsewhere.

## Options considered
- **Keep one figure per district**: simple, but misleading.
- **Neighbourhood purchase-price indices (GREIX Stadtviertel)** as a proxy: prices and rents moved in opposite
  directions in 2022 to 2023, and the proxy cannot be validated without the rent data we lack. Rejected.
- **Spatial pattern from the 2022 census, level from today's asking rents**: open data, every city, honest about
  its age. Chosen.

## Decision
- `fct_kreis_rent_range`: 10th and 90th percentile of reliable grid-cell rents relative to the median (100 m cells
  in city districts, 1 km elsewhere). The finder shows estimate × p10_index / 100 to estimate × p90_index / 100.
- `fct_postcode_rent`: each 100 m cell gets the postcode whose OpenStreetMap area contains its centre (ingestion,
  `zensus_grid.parse_100m_for`); postcodes with at least 10 reliable cells get median rent ÷ city median. The finder
  shows district estimate × rent_index_vs_kreis / 100.
- Postcode areas: OpenStreetMap via github.com/yetzt/postleitzahlen (ODbL), cut to the city districts by
  `scripts/prepare_postcodes.py`, committed under `data/raw/osm_postcodes/`. `postcodes.json` is shared under ODbL.
- The site labels every single figure "on average" and states that postcode levels follow the 2022 pattern.

## Consequences
Areas that became more expensive than their city since 2022 are underestimated, and the reverse. The fix is
current sub-city rent data; requests to data holders are drafted (Bielefeld, IBB Berlin, Munich, GREIX, RWI
FDZ Ruhr, VALUE). Postcode boundaries change rarely; re-run the prepare script when a new release is out.
