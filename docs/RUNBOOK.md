# Runbook

How ImmoDash runs in production, how to check it, and what to do when something breaks.
Audience: whoever looks after the project next. Setup from scratch is in `docs/DEPLOYMENT.md`.

## Production at a glance

| Item | Value |
|---|---|
| Live site | https://immodash-virid.vercel.app (Vercel Hobby, root directory `web`, region fra1) |
| Repository | https://github.com/zoeb-ali/immodash, branch `main` |
| Data refresh | `.github/workflows/refresh-site.yml`, Mondays 05:17 UTC, or by hand (Actions → refresh-site → Run workflow) |
| CI | `.github/workflows/ci.yml` on every push and pull request |
| Secrets (GitHub → Settings → Secrets and variables → Actions) | `GROQ_API_KEY` (LLM summaries, optional), `ZENSUS_API_TOKEN` (Zensus API, optional) |
| External services | Groq (summaries), OpenFreeMap (street map tiles), upstream data sites in `docs/data_sources.md` |
| Owner | Zoeb Ali Khan, https://github.com/zoeb-ali |

The site is static: if every service around it fails, the last published snapshot keeps being served.

## Weekly refresh: what happens

Two jobs in `.github/workflows/refresh-site.yml`:

**build** (read-only token, holds the API secrets)
1. Install locked dependencies (`requirements-dev.lock`, hashes verified).
2. Ingest: download every source (size cap, HTML pages rejected, the geo file pinned by commit and SHA-256).
   A failed download falls back to the committed file and is recorded in `data/history/ingest_log.csv`.
   The run fails when a source has fallen back for 3 runs in a row (`IMMODASH_MAX_FALLBACK_RUNS`) or a bronze
   table loses more than 20 % of its rows (`IMMODASH_MAX_ROW_DROP`); row counts go to `data/history/bronze_volumes.csv`.
   Every parser output is checked against `immodash_ingest/schemas.py`.
3. `dbt build`: models plus all data tests, including data recency (`dbt/tests/assert_sources_not_stale.sql` fails,
   `assert_sources_not_late.sql` warns). A failing test stops the run.
4. `python -m ml` with `IMMODASH_RECORD_HISTORY=1`: forecasts, back-test, anomalies; every forecast and the
   model card are appended to `data/history/`.
5. Model-quality gate: `pytest -m quality` against the new warehouse.
6. Export the snapshot (`scripts/export_static.py`), then `scripts/validate_snapshot.py` (counts, bounds, no NaN).
7. Build the website from the new snapshot.

**publish** (write token, no secrets, runs no project code): commit `data/raw`, `data/history` and
`web/public/data` as `github-actions[bot]`; Vercel deploys the push.

If any step fails nothing is committed, the site keeps the previous data, and GitHub emails the owner. The job
summary (Actions → run → Summary) lists each source's status and which city summaries changed.

**Monitor** (`.github/workflows/monitor.yml`, daily): the live pages answer and `meta.json` is younger than 8 days;
weekly it also looks for a newer VGRdL edition and opens an issue if there is one.

## Health checks (5 minutes, after each refresh or release)

- [ ] Actions: the latest `refresh-site` and `ci` runs are green.
- [ ] https://immodash-virid.vercel.app/data/meta.json shows this week's `generated_at` and the expected `latest_month`.
- [ ] `summaries_by_llm` in `meta.json` is above 30 of 37 (fewer means Groq or the grounding check needs a look).
- [ ] Home page loads; hovering the map shows a tooltip; the finder returns results.
- [ ] A city page (e.g. `/cities/bielefeld`) shows the street map with the rent grid.

## Incidents and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `refresh-site` fails at "Commit refreshed data" (happened on 12 Oct 2026) | Someone pushed to `main` while the weekly run was building, so the bot's push was rejected | The publish job now rebases and retries 3 times. If it still fails, re-run the workflow from the Actions tab; no data is lost, the next run rebuilds everything. |
| `refresh-site` fails at "Ingest" with "used its cached copy for N runs" | A source has been unreachable for three weeks | Open `data/history/ingest_log.csv` (column `error`). Find the new URL or wait for the publisher; update `config.py` (`Source.url`), test with `python -m immodash_ingest --no-record`. |
| `refresh-site` fails at "Ingest" with "dropped … % rows" | Upstream published a partial file | Compare the raw file with the previous commit. If the drop is real, raise `IMMODASH_MAX_ROW_DROP` for one run in the workflow and note why. |
| `refresh-site` fails at "Ingest" with `SchemaError` | A publisher renamed or retyped a column | Adapt the parser in `ingestion/immodash_ingest/sources/`, then the schema in `schemas.py` if the meaning is unchanged. |
| `refresh-site` fails at "Ingest" with `DownloadRejected` (checksum) | The pinned geo file changed upstream | Do not just update the hash: diff the file first. Prefer moving to BKG VG5000 directly. |
| dbt fails `assert_sources_not_stale` | A source is far behind its release calendar (see `gold.fct_source_freshness`) | Check the publisher's page. If the release is just late, raise `error_after_days` in `fct_source_freshness.sql` with a comment; if the URL moved, fix `config.py`. |
| "Model-quality gate" fails | The new data made the model worse than a baseline or its ranges dishonest | Look at `ml.forecast_backtest_city` for the city that changed. Do not loosen the test to make it pass; investigate the data first. |
| "Validate the snapshot" fails | An exported number is outside its plausible range | The message names the file and rows. Usually a bad upstream value: fix in dbt (filter or test), not in the validator. |
| `refresh-site` fails at "dbt build" | New data broke a data test (e.g. a value out of range) | Read the failing test in the log. Decide whether the data or the test is wrong; fix the model or widen the test with a comment, never just delete it. Run `make dbt` locally. |
| `refresh-site` fails at "Forecasts" | Not enough history for a city, or a library change | Run `python -m ml` locally with the same data; pin the library version in `requirements.txt` if needed. |
| Summaries all show the template | `GROQ_API_KEY` missing or expired, or every model retired | Check the secret; check `GROQ_MODELS` in `api/summary.py` against Groq's model list; run the export locally with the key. |
| Push rejected: "fetch first" | The bot committed data since your last pull | `git pull --rebase`, then `git push`. Always commit before pulling. |
| "index.lock exists" | A git command was interrupted | Make sure no git process runs, then delete `.git/index.lock`. |
| Scheduled refresh stopped running | GitHub pauses schedules after 60 days without commits | Actions → refresh-site → Enable workflow. The weekly bot commit normally prevents this. |
| Vercel build fails | Type error or a missing file in `web/public/data` | Open the Vercel deployment log; reproduce with `cd web && npx tsc --noEmit && npm run build`. |
| Bad data went live | A wrong but passing refresh | Vercel → Deployments → previous deployment → "Promote to Production" (instant rollback), then `git revert` the data commit and add a test that catches it. |
| Street map shows only the grid, no streets | OpenFreeMap unreachable | Nothing to do; the map falls back to a plain background. If it lasts, consider another vector tile host in `RentMap.tsx`. |

## Routine maintenance

| When | Task |
|---|---|
| Every release | Bump the version in `pyproject.toml`, `dbt/dbt_project.yml`, `web/package.json` and `CHANGELOG.md` together (`python scripts/check_versions.py`), tag `vX.Y.Z`, run the health checks. |
| Weekly | Review Dependabot pull requests (pip, npm, actions); CI must pass, including pip-audit and npm audit. After a Python update, regenerate the locks: `uv pip compile requirements.txt --generate-hashes --universal --python-version 3.11 -o requirements.lock` (same for `-dev`, `-api`, `-dashboard`, `-orchestration`). |
| When a source releases | GREIX: quarterly, 6 to 10 weeks after the quarter. Bundesbank: monthly, about 5 weeks after the month. VGRdL: new edition each summer under a new URL (monitor opens an issue). Zensus 2022 and BKG 2021: static. OSM postcodes: a few releases a year. |
| Once | Move district boundaries from the 2021 geoGermany copy to BKG VG5000 (current release): download from gdz.bkg.bund.de, convert with `ogr2ogr`, update `config.py` (URL and `sha256`) and `test_parsers.py` (400 instead of 401 polygons). |
| Quarterly | GREIX publishes a new quarter; check the refresh picked it up (`latest_month`). |
| Each summer | VGR der Länder publishes a new *Berechnungsstand*; update the income file URL in `config.py`. |
| Yearly | Check postcode releases at github.com/yetzt/postleitzahlen; re-run `scripts/prepare_postcodes.py` if boundaries changed. |
| Yearly | Rotate `GROQ_API_KEY`; update dependencies (`pip list --outdated`, `npm outdated`) on a branch, run `make verify`. |

## Before the API is ever hosted publicly (audit SEC-5)

The API is not public today (the site is a static export). Before hosting it: put a rate limiter in front
(platform edge rules or a reverse proxy, e.g. 60 requests per minute per IP), set `CORS_ORIGINS` to the exact
origins, keep `API_CACHE_SECONDS` at 3600 or more, and use the `/v1` routes. The public summary route never calls
the LLM, the `simplify` values are fixed and every `ags` is validated, so no request can trigger unbounded work.

## Staging

Every push to a branch gets a Vercel preview deployment (Vercel → Deployments). Open data or code changes as a
pull request, check the preview, then merge; `main` is production.

## Release procedure

1. Work on `main` (single maintainer) or a branch; keep commits small with plain messages.
2. Run `make verify` (or at least `make test` and `cd web && npm run build`).
3. Move the `[Unreleased]` notes in `CHANGELOG.md` under a new version and date.
4. Commit, `git pull --rebase`, `git push`.
5. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
6. Run the health checks above.
