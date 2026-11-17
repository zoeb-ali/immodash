# Contributing and working conventions

How changes are made in ImmoDash, so anyone picking it up works the same way. Follows
`~/Projects/_standards/PROJECT_DOCS_STANDARD.md`.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install --require-hashes -r requirements-dev.lock   # locked, hash-checked versions
pip install --no-deps -e .                              # the project itself (api, ml, immodash_ingest, ...)
pre-commit install                                      # ruff, version and link checks before each commit
make demo                      # builds the warehouse from data/raw and starts the dashboard
cd web && npm install && npm run dev   # website on http://localhost:3000
```

## Where things go

| Change | Where | Also update |
|---|---|---|
| New data source | `ingestion/immodash_ingest/config.py` (`Source`) + a parser in `sources/` + a `Job` in `pipeline.py` | `docs/data_sources.md`, `dbt/models/staging/_sources.yml`, licence in README |
| New or changed table | `dbt/models/staging/` (silver) or `dbt/models/marts/` (gold); start the `.sql` with a `-- Gold:` comment saying what one row is | Tests in `_marts.yml`, column definitions in `docs/codebook/columns.yml`, then `make docs` |
| New API endpoint | `api/main.py` + a Pydantic model in `api/schemas.py` | A test in `tests/test_api.py`, the list in `scripts/verify.py` |
| New file for the website | `scripts/export_static.py` | `PUBLISHED` list in `scripts/gen_data_dictionary.py` |
| A decision with trade-offs (new library, method, data source, hosting) | New ADR from `docs/adr/0000-template.md` | Link it from the changelog entry |
| Any text on the website | The view in `web/views/` (or the component), always in English and German: `t("…", "…")` | Check the `/de` page too |
| A claim on the website that goes beyond our own numbers | Text + `<Cite id>` | `web/lib/references.ts` with a checked link |

## Rules

- **Every number comes from the data**, every explanation beyond the data has a cited source.
- **Data tests are never deleted to make a run pass.** Fix the data or change the test with a comment saying why.
- **Every gold or ml column has a definition** in `docs/codebook/columns.yml`; `make docs-check` must pass.
- **The changelog is updated in the same commit** as the change, under `[Unreleased]`.
- **Design rules** for the website are in `DESIGN.md` and `PRODUCT.md` (one accent colour, no em dashes in site
  text, Phosphor icons, mobile first, light and dark mode).
- **Secrets** live only in GitHub Actions secrets or a local `.env` (git-ignored), never in code.
- **Pushes** come from the maintainer's own terminal; commit, then `git pull --rebase`, then push (the weekly
  bot commits data on Mondays).

## Branches and reviews

Work on a short-lived branch and open a pull request, even alone: CI runs on it and Vercel builds a preview.
Merge when both are green. Keep commits small; one change per commit.

## Dependencies

Add a package to `requirements.txt` (runtime) or `requirements-dev.txt`, then regenerate the lock files
(`uv pip compile ... --generate-hashes`, see `docs/RUNBOOK.md`). Never install unpinned packages in CI.

## Commit messages

Plain imperative sentence saying what changed and why, under about 72 characters, for example
`Add rent ranges to the finder` or `Fix contrast of market-balance pills`. The bot's `data: weekly refresh` commits
are the only automated ones.

## Before you push

```bash
ruff check . && ruff format --check . && mypy
pytest tests/unit -q            # fast unit tests, seconds
make test                       # full pytest (builds a throwaway warehouse)
make docs-check                 # every column defined
python scripts/check_versions.py && python scripts/check_links.py
cd web && npm run lint && npm run build && npm run test:e2e
```

`make verify` runs the full end-to-end check and writes `reports/verification_report.html`.
