# ImmoDash Audit

12 November 2026 · prepared for Zoeb Ali Khan

> **Status 12 Nov 2026:** fixes applied in release 1.5.0 — see the [Fix log](#fix-log--12-november-2026-release-150) at the end (51 fixed incl. 1 accepted as is, 10 partly fixed, 3 skipped on request, 5 need your action).

## Verdict

**Overall: 6.5/10 against the bar of a production system at a large company.** As a student portfolio project it remains about 8.5/10; the lower figure reflects a stricter standard, not a change of opinion.

The engineering is sound and the public attack surface is small. It loses points for three reasons: required German legal pages are missing, several headline numbers are weaker than they are presented, and production data changes weekly with little gating or monitoring. No critical security vulnerability was found.

| Discipline | Score | Main reason |
| --- | --- | --- |
| UI/UX and content | 8 | Clear, cited, polished; numbers disagree between pages |
| Frontend engineering | 7.5 | Careful build; wrong `lang` on German pages, no automated tests |
| Data engineering | 7 | Good layering and tests; freshness not really monitored, no history |
| Software engineering | 7 | Readable code; thin tests, not packaged, no type checking |
| Security | 6.5 | Nothing critical; no security headers, unpinned weekly job |
| ML and analytics | 6.5 | Correct method; unvalidated estimates and one-directional forecasts |
| DevOps and reliability | 6.5 | Right architecture; thin deploy gate, no alerting |
| Legal and compliance | 3 | No Impressum, no privacy notice, licences unconfirmed |

There are 69 findings: 9 high, 34 medium and 26 low.

**What I checked.** I read the API, ingestion, ML, workflows, Docker files, five of the 16 dbt marts, and the frontend structure and key components. I walked the live site at 1440 px and 606 px, in English and German, and scanned git history for secrets.

**What I did not check.** I did not run the tests, dbt, the linter, Lighthouse, `npm audit` or `pip-audit`. I did not review the Dash dashboard line by line, the other 11 marts, most React components, the quality of the German copy, or GitHub repository settings such as branch protection and secret scanning. The methodology, about, cities index and supply-demand pages were not reviewed visually.

## Fix first

These ten items would raise the rating most, in this order.

1. **Add an Impressum and a privacy notice** (LEG-1, LEG-2). Small effort, and the only items with direct legal exposure.
2. **Confirm data licences before any pitch or sale** (LEG-3, LEG-5). Stop committing raw files whose redistribution terms are unclear.
3. **Reword the premium and mark estimates** (ML-1, ML-2, UX-2). Present the 54% and 98% figures as a gap between two different measures, and flag the 363 modelled districts.
4. **Make numbers consistent across pages** (UX-1, ML-6). One definition per label, one rounding rule.
5. **Stress-test the forecast** (ML-3, ML-4, ML-5). Backtest over the full history, base it on a smoothed level, and label target months.
6. **Monitor real data freshness and stop swallowing download failures** (DE-1, DE-2).
7. **Gate the weekly publish** (OPS-1, OPS-2). Validate the snapshot, build the site in the job, and alert when the snapshot is stale.
8. **Lock dependencies and reduce the job's permissions** (SEC-2, SEC-3, SEC-10).
9. **Add security headers and fix the `lang` attribute** (SEC-1, FE-1).
10. **Keep history** (DE-3). Append forecasts with their origin date so live accuracy can be reported later.

## Security

Score 6.5/10. Nothing critical was found, mainly because the public product is a static site with no server, no login and no user data. The weak points are the automated weekly job and missing hardening.

A pattern scan of the full git history found no API keys, tokens or private keys. SQL in the API is parameterised throughout, DuckDB is opened read-only, and the container runs as a non-root user.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| SEC-1 | Medium | The live site sends no security headers except HSTS. | A header check on the live home page found no Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy or Permissions-Policy. `web/vercel.json` defines none. | Add a `headers` block in `vercel.json`. Use a CSP with a hash for the inline boot script and an allowance for `tiles.openfreemap.org` and MapLibre's blob worker. Add `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`. |
| SEC-2 | Medium | The weekly job is a supply-chain risk. | `requirements.txt` uses `>=` for all 22 packages and there is no lock file. `refresh-site.yml` installs the latest versions every Monday, holds `GROQ_API_KEY` and `ZENSUS_API_TOKEN`, has `contents: write`, and pushes straight to `main`, which deploys to production. Actions are pinned by tag, not commit SHA. | Lock Python dependencies with hashes (`uv lock` or `pip-compile --generate-hashes`). Pin actions to SHAs. Split the job: build without write permission, then a small job that only commits the artifact. |
| SEC-3 | Medium | Unverified third-party files flow to production automatically. | `config.py` downloads Kreis boundaries from the `main` branch of a personal GitHub repo (`Praesklepios/geoGermany`). `http.py` has no size cap, checksum or content-type check. The workflow commits `data/raw` back to the repo. | Pin the geo file to a commit SHA plus SHA-256, or take it from BKG directly. Add a maximum download size. Fail the run if a static file's hash changes. |
| SEC-4 | Medium | The Docker image can contain secrets and private notes. | `Dockerfile` runs `COPY . .`. `.dockerignore` does not exclude `.env`, `.private/`, `web/node_modules` or `.agents/`. | Add those paths to `.dockerignore`, or copy only the needed folders. |
| SEC-5 | Medium, only if the API is ever hosted | The API has no rate limiting and several expensive endpoints. | `GET /cities/{city}/summary?llm=true` calls Groq on demand with `max_retries=8` and a 60 s timeout on a sync worker. `/geo/kreise?simplify=` accepts about 500 distinct values against an `lru_cache` of 4. `/kreise/{ags}/grid` returns over 20,000 cells with no cache headers. CORS defaults to `*`. The API is not publicly deployed today. | Before hosting: add rate limiting, remove the `llm` switch from the public route, allow only fixed `simplify` values, add `Cache-Control`, and set `CORS_ORIGINS`. |
| SEC-6 | Low | Input validation is inconsistent. | `ags` is a free string in five routes. `size_band` is a `Literal` in `/kreise/rents-by-size` but a free `str` in `/affordability/finder`. | Use `Path(pattern=r"^\d{5}$")` for `ags` and the `SizeBand` type everywhere. |
| SEC-7 | Low | A removed planning file is still in public history. | `docs/PROJECT_HANDOFF.md` (133 lines) was added in the first commit and deleted in `b26a9d4`. It includes the original plan to scrape ImmobilienScout24 and ImmoWelt. A keyword scan found no secrets in it. | Decide whether you are comfortable with it being readable. If not, rewrite history with `git filter-repo`. |
| SEC-8 | Low | Your personal Gmail address is in all 21 of your commits. | `git log` author field. | Switch to the GitHub noreply address for future commits. |
| SEC-9 | Low | Default database credentials are baked in. | `docker-compose.yml` uses `immodash/immodash` and publishes port 5432. `dbt/profiles.yml` falls back to password `immodash` for the prod target. | Remove the fallback in the prod profile so a missing variable fails. Bind Postgres to `127.0.0.1`. |
| SEC-10 | Low | No automated vulnerability management. | No `dependabot.yml`, no `SECURITY.md`, no `pip-audit` or `npm audit` step in `ci.yml`. | Add Dependabot for pip, npm and actions, and an audit step in CI. |
| SEC-11 | Low | `ci.yml` sets no `permissions` block. | The workflow inherits the repository default token scope. | Add `permissions: contents: read` at the top. |

I could not run `npm audit` or `pip-audit`; the sandbox had no registry access. Known-vulnerability status of the dependencies is therefore unchecked.

## Data engineering

Score 7/10. The layering, dbt tests and typed API contracts are well above portfolio standard. A senior data engineer would reject it for production because data freshness is not really monitored and nothing is kept historically.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| DE-1 | High | Freshness is not monitored, although it looks as if it is. | `_sources.yml` sets freshness on `_loaded_at`. `warehouse.load_bronze` sets `_loaded_at` to the current time on every run, even when the file is an old cached copy. No workflow runs `dbt source freshness`. The footer shows "last automatic refresh 9 Nov" while the newest rent month is June 2026. | Log each source's content hash, `Last-Modified` and newest period into a bronze ingest log. Add dbt tests on data recency per source, for example GREIX newest month within 120 days. Show "data through" per source on the site. |
| DE-2 | High | Download failures are swallowed. | `pipeline.acquire` catches every exception and continues with the cached file, logging only a warning. The run stays green and still commits. | Count fallbacks, write them to the job summary, and fail the run when a source has fallen back for several weeks. |
| DE-3 | Medium | No history is kept. | Bronze is `create or replace`. There are no dbt snapshots. `ml.rent_forecast` is overwritten each run. | Make bronze append-only, keyed by file hash and ingest time. Append forecasts with their origin date so real forecast accuracy can be measured later. |
| DE-4 | Medium | No schema contract at the edges. | Parsers rename and cast columns without a declared schema. Gold models that the API and site depend on have no dbt `contract`. Tests are mostly `not_null`, `unique` and range checks. | Add a pandera schema per parser and `contract: enforced` on marts. Add volume tests comparing row counts with the previous run. |
| DE-5 | Medium | The Postgres reload is not atomic. | `load_table` drops each table with `CASCADE`, reloads it with `to_sql`, and relies on the next `dbt build` to recreate views. Readers see missing objects in between. | Load into a staging schema and swap, or wrap the reload in one transaction. |
| DE-6 | Medium | Source URLs are hard-coded to one edition. | The VGRdL URL contains `2026-01/vgrdl_r2b3_bs2024.xlsx`, so a newer edition is never picked up and income stays at 2023. Four Zensus tables need a token or a manual export. | Add a check that detects a newer edition and opens an issue. Document the release calendar of each source in the runbook. |
| DE-7 | Medium | Two orchestrators, only one is real. | The README lists the Prefect flow `immodash-daily-refresh`. Production runs on a weekly GitHub Actions cron with its own step list. The Prefect flow does not run the export. | Keep one path. Either have the workflow call the flow, or describe Prefect as a local option only. |
| DE-8 | Low | The repository is used as a data store. | A 9 MB grid zip, both `.csv` and `.zip` copies of four Zensus tables, and a 12 MB JSON snapshot rewritten weekly are all in git. | Keep static raw files in a release asset or object storage. Remove the duplicate zips. |
| DE-9 | Low | Boundaries are the 2021 vintage. | `test_parsers.py` expects 401 polygons because the file still contains Eisenach. | Move to the current VG5000 release from BKG. |
| DE-10 | Low | Versions and metadata are inconsistent. | `dbt_project.yml` and `pyproject.toml` say 0.1.0; the API and web package say 0.3.0. No dbt exposures for the site or API. | Use one version source and add exposures. |

## ML and analytics

Score 6.5/10. The forecasting code is technically correct, with no leakage and honestly calibrated intervals. The larger risk is in what the numbers are taken to mean: several headline figures compare unlike things, and the estimates behind the map have never been validated.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| ML-1 | High | The "asking premium" is not a like-for-like comparison. | `fct_city_snapshot` divides the 2026 median asking rent by the Zensus May 2022 mean rent of all existing contracts. The gap mixes four years of time, a different set of flats, and median against mean. The home page states "A new lease costs 54% more per m² than tenants paid in 2022"; Berlin shows +98%. | Reword as a gap between two different measures and explain the composition effect next to the number. |
| ML-2 | High | Asking rents for 363 districts are extrapolated and unvalidated. | `fct_kreis_asking_rent_estimate` applies the median premium of GREIX cities in the same Land, or the national median, to every other Kreis. Rural districts inherit big-city premiums. These estimates drive the map, the affordability finder and the postcode figures. | Validate against an independent district-level asking-rent source and publish the error. Show a range, not a point. Consider a regression on district features in place of the Land median. |
| ML-3 | High | The model predicts rising rents in every city. | In `forecasts.json` all 37 twelve-month medians are positive (+1.7% to +7.0%), and for 36 of 37 cities the whole 80% band lies above today's rent. Berlin's index fell 2.0% over the year, yet Berlin has the highest forecast, +7.0%. The backtest uses 12 origins over about three years of steady increases. | Backtest over the full history, including flat and falling periods. Report error and bias per city and direction accuracy. Flag cities where forecast and recent trend disagree. |
| ML-4 | Medium | Forecasts are scaled from a noisy monthly median. | The model forecasts the hedonic index but multiplies the latest raw median. Berlin's median moved -8.1% in April and +13.6% in May 2026. Across all cities 111 of 2,886 monthly moves exceed 5%. | Use a three-month average or an index-implied level as the base. |
| ML-5 | Medium | The forecast origin is five months old. | Latest data month is June 2026; the snapshot was generated on 9 November. The 3-month horizon targets September 2026, which has passed. The site labels it "next 12 months". | Label every forecast with its target month. |
| ML-6 | Medium | One sentence mixes two measures. | City pages show the median level with a year-on-year change taken from the hedonic index (`index_yoy_pct`). | Label which series each number comes from, or use one series for both. |
| ML-7 | Medium | Rent burden mixes years and household definitions. | 2026 asking rent is divided by 2023 disposable income per resident times two. Per-resident income averages over children and pensioners. | State both caveats beside the figure, or roll income forward with a documented assumption. |
| ML-8 | Medium | Anomaly flags are mostly noise in the median. | `anomalies.py` scores month-on-month changes of the raw median; 91 months are flagged. Berlin's May 2026 "jump" directly follows an equal fall. | Run detection on the index or a smoothed series and require the move to persist. |
| ML-9 | Medium | The grounding check validates numbers, not meaning. | The accepted Berlin summary says it "ranks 6th among the 37 most expensive German markets". `ungrounded_numbers` also always allows 60, 2, 12, 37, 80, 5 and 3, so an invented "5%" passes. Summaries are regenerated weekly even when facts are unchanged. | Have the model fill fixed sentence slots, or return structured output. Regenerate only when the facts hash changes. Review the diff before publishing. |
| ML-10 | Low | No model lineage. | The model is retrained weekly with no saved artefact, no explicit `random_state`, and coverage is reported pooled across cities only. | Save the model card and parameters per run, set a seed, and report coverage per city. |

## Software engineering

Score 7/10. The code is readable, small and consistently structured, with typed API responses and a linter in CI. It falls short on packaging, test depth and static typing.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| SWE-1 | Medium | The Python code is not an installable package. | Seven files patch `sys.path` (`api/main.py`, `ml/__main__.py`, `flows/daily_refresh.py`, four scripts). `warehouse_url` and `_normalise` are duplicated in `api/db.py` and `ingestion/immodash_ingest/config.py`. `pyproject.toml` declares no dependencies or build backend. | Move to one package with a `src` layout and `pip install -e .`. Keep one config module. |
| SWE-2 | Medium | The test suite is thin and slow by design. | 27 pytest tests in about 280 lines cover roughly 5,500 lines of Python. The session fixture in `conftest.py` runs the full ingest, `dbt build` and the ML step through subprocesses, so there are no fast unit tests. `llm_summary` is excluded from coverage. The 1,401-line Dash app has 3 tests. Coverage is not measured. | Add unit tests for parsers on small fixtures, for `forecast.build_features` and `backtest` on synthetic series, and for the grounding regexes. Add `pytest-cov` with a threshold. |
| SWE-3 | Medium | A model-quality assertion sits in CI. | `test_model_beats_baselines_out_of_sample` requires LightGBM to beat both baselines and coverage to fall in 65 to 95%. New upstream data can fail CI with no code change. | Move model-quality checks to the refresh job as a gated report. Keep CI for code correctness. |
| SWE-4 | Medium | No static type checking for Python. | No mypy or pyright in `requirements-dev.txt` or `ci.yml`. Endpoints return `list[dict]` from `select *`, so column drift is only caught by Pydantic at response time. | Add mypy or pyright to CI. Select explicit columns in the API. |
| SWE-5 | Medium | API design gaps. | No version prefix, no pagination on large lists, no cache headers. `summary._cache` is keyed by city and date and never evicted, so a long-running server grows without bound. `_dead_models` is global mutable state. | Add `/v1`, pagination or documented limits, cache headers, and a bounded TTL cache. |
| SWE-6 | Low | Dense, hard-to-review lines. | Ruff allows 140 characters. TSX files such as `Footer.tsx` and `RentCheck.tsx` carry English and German strings inline on lines over 300 characters. | Lower the line limit and move UI strings to message files. |
| SWE-7 | Low | Two user interfaces to maintain. | The Next.js site and the Dash analyst dashboard cover overlapping questions. `dashboard/app.py` is one 737-line module with 25 callback references. | Decide which is the product. Retire or clearly scope the other, and split the Dash module if it stays. |
| SWE-8 | Low | Process signals are weak. | One branch, 29 commits, several very large commits, no pull requests, no pre-commit hooks. Git tags reach `v1.1.0` while package versions say 0.1.0 and 0.3.0. | Work in short-lived branches with pull requests, add pre-commit, and align versions with tags. |

## DevOps and reliability

Score 6.5/10. The static-site design is the right call: no server to patch and no cold starts. CI also builds on both DuckDB and Postgres. The gap is that production changes every week with a thin gate and no alerting.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| OPS-1 | High | Data reaches production with only dbt tests as a gate. | `refresh-site.yml` runs ingest, `dbt build`, the ML step and the export, then pushes to `main`. It does not run pytest, `scripts/verify.py`, a snapshot sanity check or the site build. Bad but valid data, such as an absurd forecast, would go live. | Validate the exported JSON against schemas and sanity bounds in the job. Build the site there too. Publish through a pull request or a preview deployment that is promoted after checks. |
| OPS-2 | Medium | No monitoring or alerting beyond GitHub's failure email. | No uptime check, no staleness alarm, no client error tracking. Local history shows refresh commits on 5, 19 and 26 October and 2 November but none on 12 October. | Add a scheduled check that fails when `meta.json` is older than 8 days. Check the Actions log for 12 October. |
| OPS-3 | Medium | Builds are not reproducible. | Unpinned Python dependencies, see SEC-2. One Docker image serves pipeline, API and dashboard and installs Prefect, dbt, LightGBM and Dash for every role. | Lock dependencies. Use a multi-stage build with a slim API image. |
| OPS-4 | Low | No staging environment. | Railway configs exist in `deploy/railway` but the documented path is production only. | Use Vercel preview deployments as staging for data and code changes. |
| OPS-5 | Low | The domain is hard-coded. | `immodash-virid.vercel.app` appears in `layout.tsx` (`metadataBase`), the README and the canonical links. | Read the site URL from one environment variable. Move to a custom domain before any pitch. |
| OPS-6 | Low | The public repo carries files that do not belong in it. | `.agents/skills/` (third-party design skills), a 5.8 MB pitch video, and a 4.3 MB generated `reports/verification_report.html` are tracked. | Remove `.agents/` and generated reports from git. Host the video elsewhere. |
| OPS-7 | Low | A documentation link is broken. | `docs/DEPLOYMENT.md` points to `docs/PUSH_TO_GITHUB.md`, which is not in `docs/`. | Remove or restore the file. Add a link checker to CI. |
| OPS-8 | Low | CI runs one Python version. | `pyproject.toml` says `>=3.10`; CI and the Dockerfile use 3.11 only. | Test the versions you claim, or narrow the claim. |

## Frontend engineering

Score 7.5/10. Strict TypeScript, static export, lazy chart mounting, reduced-motion support, labelled controls and a skip link show real care. On the home page I found one `h1`, no images without alt text and no unlabelled inputs. What is missing is automated checking and correct language handling.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| FE-1 | Medium | German pages are served as English. | The server HTML for `/de` has `<html lang="en">`. `layout.tsx` sets `lang="de"` afterwards from an inline script. Screen readers and crawlers that read the raw HTML get the wrong language. | Use an `app/[lang]/layout.tsx` segment or two root layouts so the attribute is correct in the HTML. |
| FE-2 | Medium | Pages are heavy before any script runs. | The home page HTML is 786 KB uncompressed with 2,096 DOM nodes; `/map` is 415 KB. The district map is inlined as about 400 SVG paths. README Lighthouse scores are for the desktop profile only. | Ship the hero map as a static image with a lazy interactive layer. Publish mobile Lighthouse scores too. |
| FE-3 | Medium | No automated frontend quality checks. | `npm run lint` is only `tsc --noEmit`. There is no ESLint, no component or end-to-end tests, no accessibility test, and Lighthouse numbers in the README are entered by hand. | Add ESLint with the React hooks and jsx-a11y rules, a Playwright smoke test per route with axe, and Lighthouse CI. |
| FE-4 | Medium | District maps cannot be operated by keyboard. | On `/map` the SVG holds 402 paths and none is focusable. The search box is an alternative there. The hero map and the finder map expose details on hover only. | Keep the search alternative on every map and add a data table view. |
| FE-5 | Low | No `robots.txt` or `sitemap.xml`. | Both return 404 on the live site. Canonical and hreflang tags are present. | Generate both at build time. |
| FE-6 | Low | Language redirect happens in the browser. | The boot script sends returning German users from `/` to `/de` using `localStorage`. This causes a second page load. | Accept it for a static site, or remove the redirect and rely on the visible switch. |
| FE-7 | Low | Translations are embedded in components. | Strings are passed as `t("English", "Deutsch")` pairs and every route is duplicated under `app/de/`. A third language would touch every component. | Move strings to message catalogues keyed by id. |
| FE-8 | Low | The city map depends on a free third-party tile service. | `RentMap.tsx` loads styles from `tiles.openfreemap.org`. I did not test what the page shows if that service is down. | Add a visible fallback and a timeout. |

## UI/UX and content

Score 8/10. This is the strongest area. The site tells a clear story, explains every chart in plain language, cites its claims, and looks finished in dark mode on desktop. The findings are about consistency and honesty of presentation.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| UX-1 | High | The same thing has different numbers on different pages. | Berlin is "+52%" since January 2020 on the home chart and "+29%" over five years on its city page, because one uses the median and one the index. "Rent burden" is 8.6% for the typical district on `/affordability` (2022 census rents) and 20.9% for Berlin on its city page (today's asking rents). A 60 m² Berlin flat is 910 € in the page figures and 911 € in the AI summary. | Give each measure one name and one definition. Name variants differently. Apply one rounding rule everywhere. |
| UX-2 | Medium | Modelled values look as solid as measured ones. | The map's "rent today" layer is an estimate for 363 of 400 districts. The only notice is one sentence in the footer and "(est.)" in a chart legend. | Mark estimated districts on the map and in tooltips, and show a range. |
| UX-3 | Medium | The income meter is mislabelled. | In `RentCheck.tsx` the scale labels 0, 30, 40 and 100% are spread with `justify-content: space-between`. "40%" sits about two-thirds along the bar, while the colour changes at 40%. | Position each label at its true percentage. |
| UX-4 | Medium | German city pages show an English summary. | `/de/cities/berlin` renders the AI text in English with a note that it is English only so far. | Generate a German version, or show the German template until one exists. |
| UX-5 | Medium | The dark-mode district map is hard to read. | Most districts fall into a narrow band of similar dark blues because a few expensive cities stretch the continuous scale. | Use five to seven quantile classes with a stepped legend. |
| UX-6 | Low | Many touch targets are small. | At 606 px width on `/affordability`, 33 of 42 links and controls measured under 40 px in one dimension. This count includes inline text links. | Raise slider and chip heights to 44 px on coarse pointers. |
| UX-7 | Low | No way to learn how people use the site. | No analytics or feedback channel other than GitHub issues. | Add privacy-friendly, cookieless analytics after the privacy notice exists, and a one-click feedback link. |
| UX-8 | Low | The audience is not stated. | The site serves renters; the Dash dashboard serves analysts; the About page carries a pitch video. | Decide on one primary user and say so on the home page. |

Chrome would not narrow below 606 px, so true phone widths (360 to 390 px) are untested.

## Legal and compliance

Score 3/10. This is the weakest area and the first thing a compliance reviewer at a large German company would stop on. I am not a lawyer; treat these as items to confirm, not legal advice.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| LEG-1 | High | There is no Impressum. | `/impressum` returns 404 and the footer has no legal links. German law requires provider identification for online services that are not purely private. A public site used for job applications and carrying a pitch video is unlikely to count as purely private. | Add an Impressum page in German and English, linked from every page. |
| LEG-2 | High | There is no privacy notice. | `/datenschutz` and `/privacy` return 404. The site sends visitor IP addresses to Vercel and, on city pages, to `tiles.openfreemap.org`. It stores theme and language in `localStorage`. | Add a Datenschutzerklärung that names the host, the tile provider, the stored preferences and the legal basis. No cookie banner should be needed while there is no tracking. |
| LEG-3 | Medium | Redistribution rights for raw data are unconfirmed. | The GREIX workbooks, VGRdL workbook and Zensus files are committed to a public repo. `config.py` describes GREIX as "Free use with attribution", which is your wording, not a quoted licence. | Read each provider's terms for redistribution and commercial use. If unclear, download at build time and do not commit the files. |
| LEG-4 | Medium | Attribution may not meet every licence's form. | The footer names all sources and "dl-de/by-2-0". That licence also asks for a reference to the licence text and a note when data are modified. The derived postcode table falls under ODbL share-alike. | Link the licence texts, add a "modified by ImmoDash" note, and state the ODbL status of the postcode file where it is served. |
| LEG-5 | Medium | Commercial use changes the picture. | The footer calls this a student project. The Vercel Hobby plan is for non-commercial use, and I did not verify what the GREIX terms allow commercially. | Before selling or pitching it as a product, re-check every data licence and move to a paid hosting plan. |
| LEG-6 | Low | Advice-like statements carry risk. | City pages give tenancy tips, such as checking the Mietpreisbremse, and forecasts. The footer says "Estimates, not financial advice". | Keep the disclaimer near the forecasts and tips, and date the legal statements. |

Already correct: AI-written text is labelled with the model name, the About page photo carries author and CC BY 4.0 credit, and the README states that data keep their own licences.

## What is already good

These are worth keeping exactly as they are.

- **Architecture choice.** A static site rebuilt from a JSON snapshot removes servers, cold starts and most attack surface. The export calls the real FastAPI app in process, so the site and API share one contract.
- **Leakage-free forecasting.** `ml/forecast.py` trains only on targets known at each origin and calibrates intervals from earlier origins only. Reported 80% coverage is 77 to 82%.
- **Data tests as a deploy gate.** The dbt tests (75 by the README's count) must pass before anything is committed, and a failed run leaves the last good snapshot live.
- **Two warehouses in CI.** The same dbt project builds on DuckDB and Postgres on every push.
- **Grounded AI text with a fallback.** Any number the model invents causes the draft to be rejected and a deterministic template to be used. One of 37 cities fell back to the template in the local snapshot.
- **Documentation.** Nine ADRs, a runbook, a generated data dictionary, a changelog and a contributing guide.
- **Open data only.** ADR 0002 records the decision not to scrape listing portals.
- **Accessibility basics.** Skip link, focus styles, reduced-motion handling, aria labels on charts, and German and English versions.

---

# Fix log — 12 November 2026 (release 1.5.0)

Every finding above, what was done about it, where, and how it was checked. Nothing has been pushed: the changes
sit in the working copy at `~/Projects/immodash` for review, and are listed under `## [1.5.0]` in `CHANGELOG.md`.

**Status key:** ✅ Fixed · 🟡 Partly fixed (what is left is named) · ⏸ Skipped on request · 👤 Needs an action only
you can take (account, legal or history decision) — the exact steps are given.

## Summary

| Area | Findings | ✅ | 🟡 | ⏸ | 👤 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Security | 11 | 8 | 1 | 0 | 2 |
| Data engineering | 10 | 6 | 4 | 0 | 0 |
| ML and analytics | 10 | 9 | 1 | 0 | 0 |
| Software engineering | 8 | 6 | 2 | 0 | 0 |
| DevOps and reliability | 8 | 6 | 1 | 0 | 1 |
| Frontend | 8 | 7 | 1 | 0 | 0 |
| UI/UX and content | 8 | 7 | 0 | 1 | 0 |
| Legal | 6 | 2 | 0 | 2 | 2 |
| **Total** | **69** | **51** | **10** | **3** | **5** |

FE-6 was accepted as recommended (counted as fixed: decision recorded, nothing to change).

## Verification run (all on the final code, 12 Nov 2026)

| Check | Result |
| --- | --- |
| `ruff check .` / `ruff format --check .` (line length 120) | All checks passed / 79 files formatted |
| `mypy` | Success: no issues in 23 source files |
| `pytest --cov --cov-fail-under=80` | 69 passed (39 new unit tests), coverage 89.6 % |
| `dbt build --exclude tag:freshness` (DuckDB) | PASS=121, WARN=0, ERROR=0 (90 data tests) |
| `pip-audit` on the locks | No known vulnerabilities |
| `scripts/check_versions.py` | 1.5.0 in pyproject, dbt, web/package.json and CHANGELOG |
| `scripts/check_links.py` | 0 broken relative links |
| `scripts/gen_data_dictionary.py --check` | All 151 column names defined (23 tables, 248 columns) |
| `python -m ml` → `export_static.py --no-llm` → `validate_snapshot.py` | 95 files, 11.8 MB, data to 2026-06; Snapshot OK |
| `npm run lint` (tsc + ESLint 9) | Clean |
| `npm run build` + postbuild | 90 pages, 44 with `lang="de"`, 350 inline scripts pinned by CSP hash |
| Playwright e2e + axe, desktop and mobile | 40 / 40 passed |
| Lighthouse CI (desktop) perf / a11y / best practices / SEO | Home 90/100/100/100 · Berlin 92 · Map 93 (a11y 98) · /de 89 |
| Home page HTML | 808 KB → 356 KB (gzip 187 KB → 56 KB) |

Not verifiable in this environment: the Docker build (no Docker daemon; a CI job now builds all three targets) and
downloads from GREIX and statistikportal.de (blocked from both sandboxes; the code paths are covered by unit tests
with fixtures).

Note: `web/public/data` was regenerated with `--no-llm`, so the 37 city summaries are currently the template
text. The next Monday refresh (which has the Groq key) writes the AI text again; unchanged facts reuse the old text.

---

## Security

### SEC-1 · ✅ Security headers
- `web/vercel.json` now sends on every route: `Content-Security-Policy` (self + `tiles.openfreemap.org`,
  `blob:` workers for MapLibre, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `object-src 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` and
  `Cross-Origin-Opener-Policy: same-origin`. `/data/*` gets its own cache header.
- Next.js inlines many boot scripts, so a single hash was not enough: `web/scripts/postbuild.mjs` computes the
  SHA-256 of every inline script per page and writes a per-page CSP `<meta>` with those hashes (350 scripts
  pinned). Browsers enforce the header policy and the meta policy together, so an inline script only runs if its
  hash is listed (the header keeps `'unsafe-inline'` only as the base the meta policy narrows).
- Verified: `web/scripts/serve-out.mjs` serves the build with the same headers as Vercel; the e2e test
  "robots, sitemap and security headers" asserts them, and no CSP violation appears in the console on any route.

### SEC-2 · ✅ Supply chain of the weekly job
- Python dependencies are locked with hashes: `requirements.lock`, `requirements-dev.lock`,
  `requirements-api.lock`, `requirements-dashboard.lock`, `requirements-orchestration.lock`
  (`uv pip compile --generate-hashes --universal --python-version 3.11`; api and dashboard constrained by the main
  lock). Every workflow installs with `pip install --require-hashes -r …lock`.
- All GitHub Actions are pinned to full commit SHAs with the version in a comment (checkout v4.4.0,
  setup-python v5.6.0, setup-node v4.4.0, upload-artifact v4.6.2, download-artifact v4.3.0).
- `refresh-site.yml` is split: the **build** job (read-only token, holds the Groq key) ingests, builds, tests,
  exports, validates and uploads an artifact; the **publish** job (the only one with `contents: write`, no secrets,
  runs no project code) downloads the artifact and commits it.
- Regenerating the locks is in `make lock` and `docs/RUNBOOK.md` (maintenance table).

### SEC-3 · ✅ Unverified third-party files
- `ingestion/immodash_ingest/http.py` rewritten: `download()` enforces a maximum size (200 MB default), rejects
  `text/html` responses (error pages), computes SHA-256, records `Last-Modified`, and accepts `expect_sha256`;
  a mismatch raises `DownloadRejected` and the run fails.
- The geo boundaries file is pinned to commit `f3aa3a5…` with SHA-256 `9b00382d…1cf7` in `config.py` (verified).
- Every bronze row carries `_file_sha256`; the hash is also written to `data/history/ingest_log.csv` so a
  changed static file is visible in the history.
- Tests: `tests/unit/test_http.py` (size cap, HTML rejection, checksum mismatch).

### SEC-4 · ✅ Docker image contents
- `.dockerignore` excludes `.env*`, `.private`, `.agents`, `web/`, `docs/`, `tests/`, `Audit report/`, reports and caches.
- The `Dockerfile` is multi-stage and copies only `api/ ml/ dashboard/ flows/ ingestion/ dbt/ scripts/` per target.
- A CI job builds all targets and fails if `.env`, `.private`, `tests/` or `web/` appear in the API image.

### SEC-5 · 🟡 API rate limiting and expensive endpoints
- Done: the on-demand `llm=true` parameter is gone (the API serves the stored/template summary only, so no Groq
  call per request); `simplify` accepts only `"0" | "0.003" | "0.012"` (the cache of 3 now covers every value);
  `ags` is validated; the summary cache is a bounded TTL cache (128 entries, 6 h); `limit` on the finder is capped
  at 400; GET responses carry `Cache-Control`.
- Left: an actual rate limiter. The API is not hosted today (the site is a static export), so adding one now would
  protect nothing. `docs/RUNBOOK.md` → "Before hosting the API" lists the steps (rate limiter at the proxy,
  workers, CORS, keys) and the top of `api/main.py` says the same.

### SEC-6 · ✅ Input validation
- `api/main.py`: `Ags = Annotated[str, Path(pattern=r"^\d{5}$")]` and `AgsQuery` used on every district route;
  `SizeBand` used in the finder; `Simplify` literal. Invalid input returns 422.
- Tests: `tests/unit/test_api_validation.py`.

### SEC-7 · 👤 Planning file in public history
- This needs a history rewrite, which changes every commit hash and needs a force-push — only you should do that.
  Steps (only if you decide you want it gone):
  `pip install git-filter-repo` → `git filter-repo --path <file> --invert-paths` → `git remote add origin
  git@github.com:zoeb-ali/immodash.git` → `git push --force --all`. Forks and caches may still hold it.

### SEC-8 · 👤 Personal email in commits
- For future commits, in the repo: `git config user.email "<id>+zoeb-ali@users.noreply.github.com"` (the exact
  address is under GitHub → Settings → Emails), and tick "Block command line pushes that expose my email".
  Rewriting old commits uses `git filter-repo --mailmap` with the same force-push caveats as SEC-7.
- `dbt/models/exposures.yml` already uses a noreply owner address.

### SEC-9 · ✅ Default database credentials
- `dbt/profiles.yml`: the prod target reads `env_var('POSTGRES_PASSWORD')` with no fallback, so a missing
  variable fails.
- `docker-compose.yml`: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}`; Postgres, API
  and dashboard ports bound to `127.0.0.1`. `.env.example` documents the variable.
- The CI Postgres service uses an explicit `ci-only-password`.

### SEC-10 · ✅ Vulnerability management
- `.github/dependabot.yml`: weekly updates for pip, npm (`/web`) and GitHub Actions, grouped.
- CI runs `pip-audit` on the locks and `npm audit --audit-level=high`. `SECURITY.md` explains how to report.
- 👤 Turn on in GitHub → Settings → Code security: Dependabot alerts, secret scanning, private vulnerability
  reporting.

### SEC-11 · ✅ Workflow permissions
- `ci.yml` and `monitor.yml` start with `permissions: contents: read`; only `refresh-site` → publish has
  `contents: write`, and `monitor` → new-editions has `issues: write`.

## Data engineering

### DE-1 · ✅ Freshness really monitored
- Removed the misleading `freshness:` block in `dbt/models/staging/_sources.yml` (it measured load time, not data time).
- New mart `gold.fct_source_freshness`: one row per source with the latest data period, its age in days, the
  expected cadence, `warn_after_days` / `error_after_days`, and status ok / late / stale.
- New tests `dbt/tests/assert_sources_not_stale.sql` (error) and `assert_sources_not_late.sql` (warn), tag
  `freshness`. The weekly refresh runs them; CI excludes them (CI must not fail because a publisher is late).
- Published: API `/meta/freshness`, `freshness.json`, and a "Data through" column in the Methodology sources table.
- Today's real state, now visible instead of hidden: GREIX monthly to 2026-06 (late), GREIX rent-vs-sales to
  Q2 2025 (irregular; warn only), VGRdL income to 2023 (late).

### DE-2 · ✅ Download failures no longer swallowed
- `pipeline.acquire()` returns a status per source (downloaded / unchanged / fallback / manual / offline) and
  writes it to `data/history/ingest_log.csv` and the GitHub job summary.
- The run fails with `IngestHealthError` when a source has used its cached copy for 3 runs in a row
  (`IMMODASH_MAX_FALLBACK_RUNS`) or a bronze table drops more than 20 % of rows (`IMMODASH_MAX_ROW_DROP`).
- Tests: `tests/unit/test_pipeline_health.py`. Runbook has the incident rows.

### DE-3 · 🟡 History
- Done: every ingest appends to `data/history/ingest_log.csv` (source, status, SHA-256, bytes, Last-Modified)
  and `bronze_volumes.csv` (row counts); every weekly ML run appends `data/history/forecasts.csv` (with origin and
  target month, so real forecast accuracy can be measured as outcomes arrive) and `model_cards.csv`. The publish
  job commits `data/history`. Bronze rows carry `_file_sha256`.
- Left: bronze tables are still replaced on each run rather than append-only. With the file hash recorded and the
  raw files in git, any past load can be rebuilt; a true append-only bronze is listed under next steps in the README.

### DE-4 · 🟡 Schema contracts at the edges
- Done: `ingestion/immodash_ingest/schemas.py` declares the columns, types, nullability and value ranges of every
  bronze table; `check_schema()` runs before each load and raises `SchemaError` (tests in
  `tests/unit/test_schemas.py`). Volume tests (`row_count_between`, new macro) on 8 marts. The snapshot
  validator checks the published files (OPS-1).
- Not done: dbt `contract: enforced`. The same models build on DuckDB and Postgres, whose type names differ
  (e.g. `DOUBLE` vs `double precision`, `VARCHAR` vs `text`), so one contract cannot hold for both without
  per-adapter YAML. Pandera was not added; the plain schema module does the same job without a new dependency.

### DE-5 · ✅ Atomic Postgres reload
- `warehouse.load_bronze()` on Postgres writes `{table}__loading`, then drops the old table (cascade) and renames
  the new one inside one transaction. Readers see the old table or the new one, never a half-load.

### DE-6 · ✅ Hard-coded editions
- `scripts/check_editions.py` probes for the next VGRdL edition; `monitor.yml` runs it daily and opens a GitHub
  issue when a newer edition exists. `config.py` gained `release_note` per source.
- `docs/RUNBOOK.md` → "Routine maintenance" has the release calendar of every source.

### DE-7 · ✅ Two orchestrators
- Decision recorded: GitHub Actions `refresh-site` is production; the Prefect flow is a local/self-hosted option
  that does not publish. Stated in README (architecture diagram and stack table), `flows/daily_refresh.py`
  docstring and ADR 0010.

### DE-8 · 🟡 Repository as a data store
- Done: the four duplicate Zensus `.zip` files (the parsers read the `.csv`) are ignored in `.gitignore`; the
  commands at the end remove them from git. `data/history/README.md` documents what is stored and why.
- Left: the 9 MB grid zip and the weekly 12 MB JSON snapshot are still in git. Moving them to a release asset or
  object storage changes the deploy path (Vercel builds from the repo), so it is listed as a next step rather than
  done in this pass.

### DE-9 · 🟡 2021 boundaries
- Not migrated: the BKG download (VG5000) could not be reached from here, and the switch changes district codes
  (Eisenach merged into Wartburgkreis), which touches every mart and test. `docs/RUNBOOK.md` → "Routine
  maintenance" has the steps (download VG5000, `ogr2ogr`, new URL and SHA-256, 401 → 400 in `test_parsers.py`).

### DE-10 · ✅ Versions and metadata
- One version, 1.5.0, in `pyproject.toml`, `dbt/dbt_project.yml`, `web/package.json` and `CHANGELOG.md`; the API
  and the downloader user agent read it from package metadata. `scripts/check_versions.py` fails CI if they differ.
- `dbt/models/exposures.yml`: exposures `website` and `api`; `dbt ls --select +exposure:website` lists the 30
  models the site depends on.

## ML and analytics

### ML-1 · ✅ "Asking premium"
- Renamed everywhere to **"Asking rent vs. 2022 leases"**. The home page sentence now says it compares today's
  median asking rent with the average rent existing tenants paid in May 2022, and the glossary entry explains the
  three effects mixed in (four years of growth, new vs. existing leases, median vs. mean). It no longer says
  "a new lease costs 54 % more".
- Files: `web/views/StoryView.tsx`, `web/views/CityView.tsx`, `web/lib/glossary.ts`, `api/summary.py` (AI/template
  wording), `docs/codebook/columns.yml`.

### ML-2 · 🟡 Extrapolated district rents
- Done: leave-one-out validation (`gold.fct_asking_estimate_validation`): each measured city is hidden and
  estimated the same way as the 363 modelled districts. Result: median absolute error 6.1 %, 80 % of districts
  within 10.4 %, worst Chemnitz 26.3 %; Berlin −22.2 %. Published on the Methodology page ("How good are the
  district estimates?"), in `/validation/asking-estimate` and `estimate-validation.json`.
- Every modelled district now has `is_modelled` and a range (`estimate_low/high_eur_sqm` = ± the 80th-percentile
  error). The map outlines measured districts and shows the range in the tooltip; the finder shows the error note.
- Left: validation against an *independent* district-level asking-rent source. The open sources with district
  asking rents are listing portals, which ADR 0002 excludes. A regression on district features is noted in ADR 0011
  as the next model step.

### ML-3 · ✅ Forecast only predicts rises
- Backtest now covers every quarter from July 2015 (38 origins, 1,406 outcomes) instead of 12 origins.
- Reported per horizon and per city: MAPE, bias, direction accuracy, number of falls, 80 % coverage. 12-month
  LightGBM: MAPE 1.45 % vs. 1.99 % trend and 3.77 % no-change; bias −0.25 %; direction right 96 %; coverage 77.5 %.
- Published honestly: only 18 of 1,406 outcomes were falls, so the model has seen almost no falling markets; this
  sentence is on the Methodology page, the home outlook and ADR 0011.
- Forecasts that disagree with the city's own last 12 months are flagged (`disagrees_with_trend`, ↯ marker on the
  chart, a note on the city page). `city_code` was removed from the features (same accuracy, less memorising);
  Berlin moved from +7.35 % to +5.9 %.
- Files: `ml/forecast.py`, `ml/__main__.py`, `ml.forecast_backtest_city`, `/forecasts/backtest/cities`,
  `web/views/MethodologyView.tsx` (per-city table), `web/components/StoryCharts.tsx`.

### ML-4 · ✅ Noisy base
- The forecast base is `level_eur`, the 3-month average of the median, not the last single month
  (`base_method` is published with every forecast). Test: `tests/unit/test_forecast_unit.py`.

### ML-5 · ✅ Old origin
- Every forecast states its origin and target month ("Outlook to June 2027, from data to June 2026"); `meta.json`
  carries `forecast_origin`. Home and city pages both use it.

### ML-6 · ✅ Mixed measures in one sentence
- City page: the level is "median asking rent", every change is "on the quality-adjusted index", and the five-year
  stat is labelled "Five-year change, quality-adjusted index" with the 12-month figure "on the same index".

### ML-7 · ✅ Rent burden definitions
- Two named measures: "Rent burden (asking rent)" and "Rent burden (2022 census rents)", each with its own glossary
  entry stating the income year (2023) and the two-average-residents household. The caveats appear next to the
  figure on the city page, the affordability page and in the city table hint.

### ML-8 · ✅ Anomaly noise
- `ml/anomalies.py` rewritten to run on `nominal_rent_index` and to require persistence (a move that reverses by
  more than half the next month is dropped, `REVERSAL_SHARE = 0.5`). Flags fell from 91 to 52. Each flag carries
  `persistence` and `signal`. Tests: `tests/unit/test_anomalies_unit.py`.

### ML-9 · ✅ Grounding checks meaning
- Facts now include rank (with "1 = most expensive" spelled out in the key), number of cities, reference flat,
  rounded rent, income year, forecast target month/horizon/interval and five-year change. Every percentage must
  match a `*pct*` fact; no free constants.
- `meaning_problems()` rejects wrong ordinals, "among the most expensive" claims that do not match the rank, and
  a stated direction that contradicts the sign. Any problem → template.
- `facts_hash`: summaries are regenerated only when the facts change; the export writes a "changed summaries"
  list to the job summary for review.
- Tests: `tests/unit/test_summary_unit.py`.

### ML-10 · ✅ Model lineage
- Fixed seed (42), `deterministic=True`, `force_row_wise=True`; `MODEL_VERSION = lgbm-quantile-v2`. The model card
  stores seed, parameters, backtest origins, MAPE and coverage, and is appended to `data/history/model_cards.csv`
  each week. Coverage per city is in `ml.forecast_backtest_city`.

## Software engineering

### SWE-1 · 🟡 Installable package
- Done: `pyproject.toml` is a setuptools package (api, ml, dashboard, flows, immodash_ingest); `pip install -e .`
  works; every `sys.path` hack is gone (api, ml, flows, 4 scripts); one config module (`api/db.py` imports
  `warehouse_url` from `immodash_ingest.config`).
- Not done: moving folders into `src/`. It would touch every import, Dockerfile, workflow and doc path for no
  behaviour change; the editable install gives the same import safety.

### SWE-2 · ✅ Tests
- 39 new fast unit tests in `tests/unit/` (HTTP, pipeline health, schemas, forecast features and backtest on
  synthetic series, anomalies, summary grounding, API validation, snapshot validator). They need no warehouse.
- `pytest-cov` with `--cov-fail-under=80` in CI; current 89.6 %. `IMMODASH_TEST_WAREHOUSE` lets tests reuse a
  built warehouse locally.

### SWE-3 · ✅ Model quality out of CI
- The model test is marked `@pytest.mark.quality`, deselected in CI and run in the weekly refresh as a gate
  (it also asserts ≥ 30 backtest origins). CI checks code; the refresh checks the model.

### SWE-4 · ✅ Type checking and explicit columns
- `mypy` in CI (config in `pyproject.toml`), clean. Every API query selects explicit columns through `cols(model)`
  from the response schema; no `select *` remains.

### SWE-5 · ✅ API design
- Routes under `/v1` (unprefixed kept for the static export, hidden from the schema); documented limits
  (finder `limit` ≤ 400); `Cache-Control` headers; bounded TTL cache for summaries.

### SWE-6 · 🟡 Dense lines
- Done: line length lowered to 120 and `ruff format` applied to the whole Python codebase.
- Left: moving UI strings to message files (same as FE-7).

### SWE-7 · ✅ Two user interfaces
- Decided in ADR 0010: the website is the product; the Dash app stays as a local analyst tool (you chose to keep
  both). The ADR scopes how Dash would be split if it grows. README and CONTRIBUTING say the same.

### SWE-8 · ✅ Process
- `.pre-commit-config.yaml` (YAML/JSON checks, end-of-file, trailing whitespace, large files, private-key
  detection, ruff, the version check and the doc-link check);
  `CONTRIBUTING.md` describes short-lived branches and pull requests; versions aligned and checked (DE-10);
  a `## [1.5.0]` changelog entry ready for a `v1.5.0` tag.

## DevOps and reliability

### OPS-1 · ✅ Deploy gate
- `scripts/validate_snapshot.py` checks every published file: required files, row counts, plausible bounds
  (rents, percentages), no NaN, and `--max-age-days`. It runs in the refresh (blocking) and in CI.
- The site is built (`npm run build`) inside the refresh before anything is committed; publish only commits an
  artifact that passed dbt (incl. freshness), the model-quality gate, the validator and the build.
- A PR-based publish was considered and rejected: PRs opened with the workflow token do not trigger CI. The
  split build/publish jobs give the same gate.

### OPS-2 · ✅ Monitoring and the 12 October failure
- `.github/workflows/monitor.yml` runs daily: fetches the live site and `meta.json`, fails if `generated_at` is
  older than 8 days, and checks for new source editions.
- 12 October: the Actions API shows the scheduled run failed at **"Commit refreshed data"** (every step before it
  passed), i.e. the push was rejected, most likely because `main` moved during the run. The publish step now
  fetches 20 commits, and on rejection rebases onto `main` and retries 3 times. Runbook row added.

### OPS-3 · ✅ Reproducible builds
- Hash-locked dependencies (SEC-2), `package-lock.json` with `npm ci`, multi-stage `Dockerfile` with `api`
  (slim API lock only), `dashboard` and `pipeline` targets.

### OPS-4 · 🟡 Staging
- Documented in `docs/RUNBOOK.md` → "Staging": Vercel preview deployments for branches, and how to check a data
  change on a preview before merging. 👤 Enable preview comments in the Vercel project if you want links on PRs.

### OPS-5 · 👤 Hard-coded domain
- Done: `SITE_URL` comes from `NEXT_PUBLIC_SITE_URL` (`web/lib/site.ts`), used by metadata, sitemap and robots.
- Yours: buying and connecting a custom domain, then setting `NEXT_PUBLIC_SITE_URL` in Vercel and the `SITE_URL`
  variable in GitHub (used by `monitor.yml`).

### OPS-6 · ✅ Files that do not belong
- `.gitignore` now covers `.agents/`, `reports/*.html`, `reports/*.json` and test outputs; the commands below
  untrack the ones already committed. The pitch video stays (you chose to keep it); it is 5.9 MB and loads only
  on play.

### OPS-7 · ✅ Broken doc link
- `docs/DEPLOYMENT.md` fixed. `scripts/check_links.py` checks every relative link and backticked path in the
  docs and runs in CI (0 broken).

### OPS-8 · ✅ Python versions
- Narrowed the claim: `requires-python = ">=3.11"` with a comment that CI, Docker and the refresh all run 3.11;
  locks are compiled for 3.11.

## Frontend

### FE-1 · ✅ `lang` on German pages
- `web/scripts/postbuild.mjs` rewrites `<html lang="en">` to `lang="de"` on all 44 German pages of the static
  export (a root `[lang]` segment would have meant restructuring every route). The e2e test asserts it.

### FE-2 · ✅ Page weight
- The home hero map is served as two static theme SVGs (`/hero-map-light.svg`, `/hero-map-dark.svg`, route
  handlers generated at build); the interactive paths (`/hero-map-paths.svg`) load on first pointer enter.
  Home HTML 808 KB → 356 KB, gzip 187 KB → 56 KB.
- Mobile Lighthouse budgets are in `web/lighthouserc.mobile.json` and run in CI; README states both profiles.

### FE-3 · ✅ Frontend checks
- ESLint 9 with `eslint-config-next` (React hooks, jsx-a11y) — `npm run lint` = `tsc --noEmit && eslint .`.
- Playwright smoke test per route with axe (`web/tests/e2e/smoke.spec.ts`), desktop and mobile: 40/40.
- Lighthouse CI with budgets. All three run in the CI web job.

### FE-4 · ✅ Keyboard access to maps
- `KreisMap.tsx` has a "Show as table" disclosure with every district, its value and whether it is measured or
  modelled; the search stays on every map. Scrollable tables are focusable (`tabIndex=0`).

### FE-5 · ✅ robots and sitemap
- `web/app/robots.ts` and `web/app/sitemap.ts` (all English and German routes with `hreflang` alternates).

### FE-6 · ✅ Client-side language redirect (accepted)
- Kept as the audit allows for a static site: it only runs for a visitor who chose German before, and the
  visible switch remains.

### FE-7 · 🟡 Translations in components
- Not moved to catalogues in this pass. It is a large mechanical refactor of every view with high regression risk
  and no user-visible change; listed as a next step.

### FE-8 · ✅ Tile service dependency
- `RentMap.tsx`: if tiles have not loaded after 8 seconds (or fail), the map is replaced by a visible note and
  the grid figures stay available.

## UI/UX and content

### UX-1 · ✅ One name per measure
- Levels are "median asking rent", changes are "quality-adjusted index", burden is "asking rent" vs. "2022 census
  rents", premium is "Asking rent vs. 2022 leases"; the five-year and since-2020 figures say which series they
  use. Monthly reference rents are rounded to 10 € everywhere (`fct_city_snapshot`).

### UX-2 · ✅ Modelled vs measured
- Measured districts are outlined on the map; tooltips for modelled ones say "estimate" with the range; the card
  and finder show the validation error. See ML-2.

### UX-3 · ✅ Income meter
- `RentCheck.tsx` places each label (0, 30, 40, 100 %) absolutely at its true position.

### UX-4 · ✅ German summaries
- `summary.py` produces `text_de` from the same grounded facts (German number formats); `/de/cities/*` shows it.

### UX-5 · ✅ Dark-mode district map
- `KreisMap.tsx` uses five threshold classes with a stepped legend (`legend-steps`) in both themes.

### UX-6 · ✅ Touch targets
- At ≤ 720 px, chips, segmented buttons, small buttons, the language switch, sliders,
  selects and inputs get `min-height: 44px` (`globals.css`). Mobile e2e at 390 px passes.

### UX-7 · ⏸ Analytics
- Waits for the privacy notice (LEG-2), as the audit says. Feedback link: the footer already links GitHub issues.

### UX-8 · ✅ Audience
- Home page states it under the hero: the site is for people renting or about to rent in Germany; the Dash app is
  described as the analyst tool (ADR 0010).

## Legal and compliance

I am not a lawyer; these notes say what was changed in the code, not whether it is legally sufficient.

### LEG-1 · ⏸ Impressum — skipped at your request, to discuss afterwards.

### LEG-2 · ⏸ Privacy notice — skipped at your request.

### LEG-3 · 👤 Redistribution rights
- `config.py` now says "redistribution terms not confirmed" for GREIX instead of "free use". Confirming the
  terms with GREIX/Kiel Institute and VGRdL is yours; if they do not allow redistribution, the fallback is to
  download at build time and stop committing the raw files (the ingest code already supports it).

### LEG-4 · ✅ Attribution form
- Each source in `sources.json` and the Methodology table links its licence text (`licence_url`), the page says
  the data were modified by ImmoDash, and the postcode data are marked ODbL where they are served.

### LEG-5 · 👤 Commercial use
- Before selling or pitching it as a product: re-check each licence for commercial use and move off the Vercel
  Hobby plan. Nothing to change in code.

### LEG-6 · ✅ Disclaimers
- City pages: "General information as of <date>, not legal or financial advice…" under the tips; home outlook:
  "Model estimate as of <date>, not financial advice." Both dated from `meta.generated_at`.

---

## What you need to do

1. Review the diff in `~/Projects/immodash` (`git status`, `git diff`).
2. Commit and push from your own terminal (commands below — nothing was pushed from this session).
3. GitHub settings: Dependabot alerts, secret scanning, private vulnerability reporting, branch protection on
   `main` (require CI), and a repository variable `SITE_URL` = `https://immodash-virid.vercel.app`.
4. Optional: SEC-7 / SEC-8 history and email changes; LEG-3 / LEG-5 licence confirmation; LEG-1 / LEG-2 when we
   pick them up.

```bash
cd ~/Projects/immodash
git rm -r --cached .agents reports/verification_report.html reports/verification.json 2>/dev/null
git rm --cached data/raw/zensus/*.zip && rm data/raw/zensus/*.zip
rm -f .private/repo_src.tgz .private/immodash_audit_fixes.tgz .private/final_patch.tgz
git add -A
git commit -m "Release 1.5.0: fixes from the November 2026 audit"
git tag v1.5.0
git pull --rebase
git push && git push --tags
```
