"""Load DataFrames into the bronze schema of DuckDB (local) or Postgres (production)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import pandas as pd
from sqlalchemy import create_engine, text

from .config import warehouse_url

log = logging.getLogger(__name__)
BRONZE = "bronze"


def read_sql(sql: str, url: str | None = None) -> pd.DataFrame:
    """Run a read query against the warehouse and return a DataFrame."""
    url = url or warehouse_url()
    if _is_duckdb(url):
        import duckdb

        with duckdb.connect(url.split("duckdb:///", 1)[1], read_only=True) as con:
            return con.execute(sql).df()
    with create_engine(url).connect() as conn:
        return pd.read_sql(text(sql), conn)


def _is_duckdb(url: str) -> bool:
    return url.startswith("duckdb")


def load_bronze(df: pd.DataFrame, table: str, *, source_key: str, url: str | None = None, file_sha256: str = "") -> int:
    """Replace `bronze.<table>` with `df` plus lineage columns. Returns row count.

    `_loaded_at` is when this run loaded the table, not how new the data is; data recency is tested on the
    content itself (gold.fct_source_freshness) and every fetch is recorded in data/history/ingest_log.csv."""
    df = df.copy()
    df["_source"] = source_key
    df["_file_sha256"] = file_sha256
    df["_loaded_at"] = datetime.now(UTC).replace(tzinfo=None)
    return load_table(df, table, schema=BRONZE, url=url)


def load_table(df: pd.DataFrame, table: str, *, schema: str, url: str | None = None) -> int:
    """Create or replace `<schema>.<table>` from a DataFrame (DuckDB or Postgres)."""
    url = url or warehouse_url()

    if _is_duckdb(url):
        import duckdb

        path = url.split("duckdb:///", 1)[1]
        from pathlib import Path

        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with duckdb.connect(path) as con:
            con.execute(f"create schema if not exists {schema}")
            con.register("df_in", df)
            con.execute(f"create or replace table {schema}.{table} as select * from df_in")
            con.unregister("df_in")
    else:
        # DE-5: load into a staging table first, then swap it in inside one transaction, so readers never see
        # a missing or half-loaded table. Views built on the old table are dropped by CASCADE inside the same
        # transaction and recreated by the next `dbt build`.
        engine = create_engine(url)
        staging = f"{table}__loading"
        chunk = max(1, 60000 // max(1, len(df.columns)))  # stay below the 65535 bind-parameter limit
        with engine.begin() as conn:
            conn.execute(text(f"create schema if not exists {schema}"))
            conn.execute(text(f'drop table if exists {schema}."{staging}"'))
            df.to_sql(staging, conn, schema=schema, if_exists="replace", index=False, chunksize=chunk, method="multi")
            conn.execute(text(f'drop table if exists {schema}."{table}" cascade'))
            conn.execute(text(f'alter table {schema}."{staging}" rename to "{table}"'))
    log.info("loaded %d rows into %s.%s", len(df), schema, table)
    return len(df)
