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

1. Download every source; a failed download falls back to the committed file in `data/raw/`.
2. `dbt build`: silver and gold models plus all data tests. Any failing test stops the run.
3. `python -m ml`: forecasts, back-test, anomalies.
4. `python scripts/export_static.py`: API snapshot into `web/public/data/` (LLM summaries if `GROQ_API_KEY` is set).
5. Commit `data/raw` and `web/public/data` as `github-actions[bot]` with message `data: weekly refresh YYYY-MM-DD`.
6. Vercel sees the push and redeploys.

If any step fails nothing is committed, the site keeps the previous data, and GitHub emails the owner.

## Health checks (5 minutes, after each refresh or release)

- [ ] Actions: the latest `refresh-site` and `ci` runs are green.
- [ ] https://immodash-virid.vercel.app/data/meta.json shows this week's `generated_at` and the expected `latest_month`.
- [ ] `summaries_by_llm` in `meta.json` is above 30 of 37 (fewer means Groq or the grounding check needs a look).
- [ ] Home page loads; hovering the map shows a tooltip; the finder returns results.
- [ ] A city page (e.g. `/cities/bielefeld`) shows the street map with the rent grid.

## Incidents and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `refresh-site` fails at "Ingest" | Upstream URL changed or a site is down | Run again later. If it persists, find the new URL, update `config.py` (`Source.url`), test with `python -m immodash_ingest`. |
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
| Every release | Update `CHANGELOG.md`, tag `vX.Y.Z`, run the health checks. |
| Quarterly | GREIX publishes a new quarter; check the refresh picked it up (`latest_month`). |
| Each summer | VGR der Länder publishes a new *Berechnungsstand*; update the income file URL in `config.py`. |
| Yearly | Check postcode releases at github.com/yetzt/postleitzahlen; re-run `scripts/prepare_postcodes.py` if boundaries changed. |
| Yearly | Rotate `GROQ_API_KEY`; update dependencies (`pip list --outdated`, `npm outdated`) on a branch, run `make verify`. |

## Release procedure

1. Work on `main` (single maintainer) or a branch; keep commits small with plain messages.
2. Run `make verify` (or at least `make test` and `cd web && npm run build`).
3. Move the `[Unreleased]` notes in `CHANGELOG.md` under a new version and date.
4. Commit, `git pull --rebase`, `git push`.
5. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
6. Run the health checks above.
