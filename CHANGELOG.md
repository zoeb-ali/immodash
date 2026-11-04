# Changelog

All notable changes to ImmoDash. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):
MAJOR for breaking changes to the data contracts (API fields, published files), MINOR for new features,
PATCH for fixes. The weekly `data: weekly refresh` commits by the bot change data only and are not listed.

## [Unreleased]

### Added
- About page: the 50-second pitch film (`web/public/video/immodash-pitch.mp4`, 1600 px H.264, 5.9 MB) in a section
  before "Growing up in Mumbai", shown as a poster with a play button; the video loads only on play (`PitchVideo.tsx`).
- About page hero: Berlin's Zensus 100 m rent grid as a background picture behind the title, one version per theme,
  fading towards the text, with a note saying what it shows. Rendered from our own data by `scripts/render_hero_grid.py`.
- German version of the whole site under `/de` (all pages, charts, tooltips, glossary, references), with an EN | DE
  switch in the header that opens the same page in the other language. German pages use German number formats
  (1.050,00 €, 3,5 %), German city names and `lang="de"`; every page links its counterpart with `hreflang`.
  A visitor who picked German before lands on `/de` when opening the home page. City summaries written by the AI
  stay English for now and are labelled as such. See ADR 0009.
- Project documentation set following `~/Projects/_standards/PROJECT_DOCS_STANDARD.md`: this changelog,
  `CONTRIBUTING.md`, `docs/RUNBOOK.md`, `docs/README.md` (documentation index), ADR template and ADRs 0007 (postcode estimates and rent ranges) and 0008 (street map).
- Data dictionary generated from the warehouse: `docs/DATA_DICTIONARY.md`, with column definitions in
  `docs/codebook/columns.yml`, the generator `scripts/gen_data_dictionary.py`, and `make docs` / `make docs-check`.

### Changed
- Pages are rendered by language-aware views in `web/views/`; `web/app/*` and `web/app/de/*` are thin route files.
  Shared helpers: `web/lib/i18n.ts`, `web/lib/useLang.ts`, `fmt(lang)` in `web/lib/format.ts`, `pageMeta` in `web/lib/meta.ts`.
- The inline navigation starts at 1081 px (was 921 px) to make room for the language switch and the longer German labels.
- Page heroes: key figures moved from beside the title to one row across the full width under it.
- How it works, About and Supply & demand open with a full-screen hero (title, lead, key figures, scroll cue);
  the page content starts after scrolling.
- Section intros (for example References) now run across the full width under their headline.
- Methodology page: dataset count updated to eleven (postcode boundaries added in 1.4.0).

## [1.4.1] - 2026-10-30

### Changed
- GitHub username and portfolio links moved from `zoeb7184` to `zoeb-ali` across the site, README, docs,
  dashboard and the downloader's user agent. Git remote: `github.com/zoeb-ali/immodash`.

## [1.4.0] - 2026-10-07

### Added
- Affordability finder: a range from cheaper to dearer areas for every district (10th to 90th percentile of
  Zensus grid cells), with the user's budget marked on it, and the range under each average in the results table.
- Estimates for 1,122 postcodes in the 37 cities, searchable by postcode, with "x of y postcodes fit your budget".
- Postcode areas from OpenStreetMap (yetzt/postleitzahlen release 2026.02, ODbL), cut to the city districts by
  `scripts/prepare_postcodes.py` and assigned to 100 m grid cells at ingestion.
- dbt marts `fct_postcode_rent` and `fct_kreis_rent_range` (12 new data tests, 75 in total); API endpoints
  `/postcodes/rents` and `/kreise/rent-range` (25 in total); site files `postcodes.json` and `kreise-rent-range.json`.
- City pages: the 100 m rent grid on a zoomable street map (MapLibre GL, OpenFreeMap tiles, light and dark styles),
  fixed screen-sized height, cooperative gestures. EPSG:3035 to WGS84 conversion in `web/lib/laea.ts`.
- About page (`/about`): why the project exists, with five new references (21 in total).

### Fixed
- The "cheapest large city" hint ignored the state filter and named rural districts; it now appears only when
  nothing fits and names the cheapest district inside the selection.
- Estimates are labelled "on average" wherever a single district figure is shown.

### Removed
- `web/components/GridHeatmap.tsx` (replaced by `RentMap.tsx`).

## [1.3.0] - 2026-10-06

### Added
- README: live link, screenshots, Lighthouse scores, "What I'd do next", licence section.
- MIT `LICENSE` for the code.
- Link preview image (`web/public/og.png`) with Open Graph and Twitter metadata.

### Changed
- Home hero map projected at build time (`web/lib/heroMap.ts`) and coloured with CSS `color-mix()`; charts below the
  fold mount when scrolled near (`LazyMount`). Desktop Lighthouse performance on the home page: 83 to 99.
- Methodology page: API endpoint count corrected to 23.

### Fixed
- Text contrast of verdict badges and market-balance pills (accessibility 96 to 100).

### Removed
- Internal notes `docs/PUSH_TO_GITHUB.md` and `docs/PROJECT_HANDOFF.md` (moved to the git-ignored `.private/`).

## [1.2.0] - 2026-10-04

### Added
- Numbered citations `[n]` on every explanatory claim, linking to a References section on `/methodology`
  (16 publications: official statistics, law, peer-reviewed methods). Glossary terms show their source.
- Key-figure panels in page heroes; section intros beside their headline on wide screens.

### Changed
- Claims without a supporting source rewritten or removed (new-build bias, landlord income rule, vacancy threshold).

### Fixed
- Table cells inherited the `.wrap` container style and were indented (`td.wrap` renamed to `td.cellwrap`).

## [1.1.0] - 2026-10-03

### Added
- Website redesigned as an editorial data story: rent check against the 30% rule, trend, new-lease premium,
  12-month outlook, city table; glossary terms, "how to read this chart" and "show the numbers" on every figure.
- Design system (`PRODUCT.md`, `DESIGN.md`) with Taste Skill, Impeccable and Responsive Craft; Geist fonts,
  Phosphor icons, fluid full-width layout, light and dark themes.
- Footer with project status, link columns and data credits.

### Fixed
- Misaligned side-by-side figures; supply-demand search now clearly highlights the chosen district.

## [1.0.1] - 2026-10-03

### Fixed
- LLM summaries failed with `model_not_found` after Llama 3.3 was retired on Groq; default model is now
  `openai/gpt-oss-120b` with a fallback list.
- Grounding check rejected valid drafts with thousands separators ("1,050", "1 394") and percentile labels.

## [1.0.0] - 2026-10-03

### Added
- First public release, live at https://immodash-virid.vercel.app.
- Ingestion of open sources into bronze; dbt silver and gold layers on DuckDB and PostgreSQL with data tests.
- FastAPI read layer with typed contracts; Plotly Dash analyst workbench; Next.js static site.
- LightGBM quantile forecasts with conformal calibration and rolling-origin back-test; robust-z anomaly detection.
- Grounded LLM city summaries; Prefect flow; Docker Compose; CI on GitHub Actions.
- Weekly `refresh-site` workflow that rebuilds the data and redeploys the site on Vercel.

[Unreleased]: https://github.com/zoeb-ali/immodash/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/zoeb-ali/immodash/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/zoeb-ali/immodash/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/zoeb-ali/immodash/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/zoeb-ali/immodash/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/zoeb-ali/immodash/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/zoeb-ali/immodash/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/zoeb-ali/immodash/releases/tag/v1.0.0
