.PHONY: install ingest dbt ml refresh api dashboard test test-unit lint lock up down demo verify docs docs-check web e2e

export DBT_PROFILES_DIR := $(CURDIR)/dbt

install:           ## locked, hash-checked dependencies + the project in editable mode
	pip install --require-hashes -r requirements-dev.lock
	pip install --no-deps -e .

lock:              ## regenerate every lock file after changing a requirements*.txt
	for f in requirements requirements-dev requirements-orchestration; do \
	  uv pip compile $$f.txt --generate-hashes --universal --python-version 3.11 -o $$f.lock; done
	for f in requirements-api requirements-dashboard; do \
	  uv pip compile $$f.txt --generate-hashes --universal --python-version 3.11 -c requirements.lock -o $$f.lock; done

lint:              ## ruff, formatting, mypy, versions, doc links
	ruff check . && ruff format --check . && mypy
	python scripts/check_versions.py && python scripts/check_links.py

ingest:            ## raw files -> bronze (records history and runs health checks)
	python -m immodash_ingest

dbt:               ## bronze -> silver -> gold, with tests (data-recency tests: `cd dbt && dbt build`)
	cd dbt && dbt build --exclude tag:freshness

ml:                ## gold -> forecasts + anomalies (schema ml)
	python -m ml

refresh: ingest dbt ml

demo:              ## build everything offline and start API + dashboard (Ctrl+C to stop)
	./scripts/run_local.sh

verify:            ## full check: lint, build, data tests, unit/API tests, live endpoint smoke test, HTML report
	python scripts/verify.py

api:
	uvicorn api.main:app --reload --port 8000

dashboard:
	python -m dashboard.app

test:              ## full pytest with coverage (builds a throwaway warehouse)
	pytest -q --cov

test-unit:         ## fast unit tests only, no warehouse
	pytest -q tests/unit

web:               ## lint and build the site from the committed snapshot
	cd web && npm ci && npm run lint && npm run build

e2e:               ## Playwright + axe on every page (after `make web`)
	cd web && npm run test:e2e

up:                ## full stack: postgres + pipeline + api + dashboard
	docker compose up --build

down:
	docker compose down

docs:              ## regenerate docs/DATA_DICTIONARY.md from the warehouse, dbt models and docs/codebook/columns.yml
	python scripts/gen_data_dictionary.py

docs-check:        ## fail if any gold/ml column has no definition in docs/codebook/columns.yml
	python scripts/gen_data_dictionary.py --check
