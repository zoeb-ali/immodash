# Multi-stage image (OPS-3): one target per role, each with only what it needs.
#   docker build --target api       -t immodash-api .        # slim read API
#   docker build --target pipeline  -t immodash-pipeline .   # ingest + dbt + ML (+ Prefect)
#   docker build --target dashboard -t immodash-dashboard .  # local analyst dashboard
#   docker build -t immodash .                                # default = pipeline stage (all roles, used by Railway)
# Only the folders each role uses are copied (SEC-4); .dockerignore keeps secrets and private notes out as well.
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
RUN useradd --create-home --uid 10001 appuser

# ---------------------------------------------------------------- API: FastAPI over the warehouse
FROM base AS api
COPY requirements-api.lock ./
RUN pip install --require-hashes -r requirements-api.lock
COPY pyproject.toml README.md ./
COPY api ./api
COPY ingestion ./ingestion
RUN pip install --no-deps -e . && chown -R appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]

# ---------------------------------------------------------------- dashboard: local analyst tool (docs/adr/0010)
FROM base AS dashboard
COPY requirements-dashboard.lock ./
RUN pip install --require-hashes -r requirements-dashboard.lock
COPY dashboard ./dashboard
RUN chown -R appuser /app
USER appuser
EXPOSE 8050
CMD ["sh", "-c", "gunicorn dashboard.app:server --bind 0.0.0.0:${PORT:-8050} --workers 2 --timeout 120"]

# ---------------------------------------------------------------- pipeline: ingest -> dbt -> ML -> export
# Last stage = the default image. It contains every dependency, so the Railway services (deploy/railway/*.toml),
# which build the default target and pick their role with startCommand, keep working unchanged.
FROM base AS pipeline
# libgomp: OpenMP runtime required by LightGBM
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
ENV DBT_PROFILES_DIR=/app/dbt
COPY requirements-orchestration.lock ./
RUN pip install --require-hashes -r requirements-orchestration.lock
COPY pyproject.toml README.md ./
COPY api ./api
COPY ingestion ./ingestion
COPY ml ./ml
COPY flows ./flows
COPY dashboard ./dashboard
COPY dbt ./dbt
COPY scripts ./scripts
COPY data ./data
RUN pip install --no-deps -e . && chown -R appuser /app
USER appuser
CMD ["python", "flows/daily_refresh.py"]
EXPOSE 8000 8050
