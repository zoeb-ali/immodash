"""Central configuration: paths, warehouse URL and the source registry."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = Path(os.getenv("IMMODASH_RAW_DIR", PROJECT_ROOT / "data" / "raw"))
DEFAULT_WAREHOUSE_URL = f"duckdb:///{PROJECT_ROOT / 'warehouse' / 'immodash.duckdb'}"


def warehouse_url() -> str:
    return _normalise(os.getenv("WAREHOUSE_URL") or os.getenv("DATABASE_URL") or DEFAULT_WAREHOUSE_URL)


def _normalise(url: str) -> str:
    """Accept postgres://... / postgresql://... (Railway, Render, Neon) and use the psycopg 3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


@dataclass(frozen=True)
class Source:
    """A public dataset. `url` is the canonical download location; `filename` is the
    local copy under data/raw/<folder>/ that the parser reads.

    `sha256` pins a file that must never change (a fixed release): a download with another checksum is
    rejected. `licence_url` links the licence text. `release_note` says how and when a new edition appears,
    which the runbook repeats and scripts/check_editions.py watches."""

    key: str
    folder: str
    filename: str
    url: str | None
    licence: str
    publisher: str
    licence_url: str | None = None
    sha256: str | None = None
    release_note: str = ""


SOURCES: dict[str, Source] = {
    s.key: s
    for s in [
        Source(
            key="zensus_rent_by_rooms",
            folder="zensus",
            filename="4000W-0011_de_flat.csv",
            url=None,  # fetched through the Zensus database API (token) or exported manually
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0011)",
            licence_url="https://www.govdata.de/dl-de/by-2-0",
            release_note="Census of May 2022; final results published 2024. No new edition until the next census.",
        ),
        Source(
            key="zensus_vacancy",
            folder="zensus",
            filename="4000W-0002_de_flat.csv",
            url=None,
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0002)",
            licence_url="https://www.govdata.de/dl-de/by-2-0",
            release_note="Census of May 2022; static.",
        ),
        Source(
            key="zensus_rent_by_size",
            folder="zensus",
            filename="4000W-0009_de_flat.csv",
            url=None,
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0009)",
            licence_url="https://www.govdata.de/dl-de/by-2-0",
            release_note="Census of May 2022; static.",
        ),
        Source(
            key="zensus_bezirke_rent",
            folder="zensus",
            filename="4000W-0004_de_flat.csv",
            url=None,
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0004, Bezirke)",
            licence_url="https://www.govdata.de/dl-de/by-2-0",
            release_note="Census of May 2022; static.",
        ),
        Source(
            key="osm_postcodes",
            folder="osm_postcodes",
            filename="postleitzahlen_city_kreise.geojson",
            # subset of github.com/yetzt/postleitzahlen (release 2026.02), made by scripts/prepare_postcodes.py
            url=None,
            licence="ODbL 1.0 (© OpenStreetMap contributors); the derived postcode rent table is shared under ODbL",
            publisher="OpenStreetMap postcode boundaries via yetzt/postleitzahlen (release 2026.02)",
            licence_url="https://opendatacommons.org/licenses/odbl/1-0/",
            release_note=(
                "yetzt/postleitzahlen publishes a release a few times a year; rebuild with "
                "scripts/prepare_postcodes.py."
            ),
        ),
        Source(
            key="zensus_grid_rent",
            folder="zensus_grid",
            filename="Zensus2022_Durchschn_Nettokaltmiete.zip",
            url="https://www.destatis.de/static/DE/zensus/gitterdaten/Zensus2022_Durchschn_Nettokaltmiete.zip",
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 Gitterzellen (100 m / 1 km)",
            licence_url="https://www.govdata.de/dl-de/by-2-0",
            release_note="Census of May 2022 grid; static.",
        ),
        Source(
            key="vgrdl_income",
            folder="vgrdl",
            filename="vgrdl_r2b3_bs2024.xlsx",
            url="https://www.statistikportal.de/sites/default/files/2026-01/vgrdl_r2b3_bs2024.xlsx",
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Arbeitskreis VGR der Länder, Reihe 2 Band 3 (Berechnungsstand 2024)",
            licence_url="https://www.govdata.de/dl-de/by-2-0",
            release_note=(
                "New Berechnungsstand each summer under a new URL (statistikportal.de); "
                "scripts/check_editions.py looks for it."
            ),
        ),
        Source(
            key="greix_rents",
            folder="greix",
            filename="City_metrics_public.xlsx",
            url=(
                "https://www.kielinstitut.de/fileadmin/Dateiverwaltung/IfW_Unit/Macroeconomics/"
                "GREIX/Mietpreisindex/City_metrics_public.xlsx"
            ),
            licence=(
                "Published free of charge by the Kiel Institute with attribution requested; redistribution "
                "terms not confirmed"
            ),
            publisher="GREIX Mietpreisindex, Kiel Institut für Weltwirtschaft",
            licence_url="https://www.kielinstitut.de/de/forschung/forschungszentren/makrooekonomie/greix/",
            release_note="Quarterly, roughly 6 to 10 weeks after the quarter ends, same URL.",
        ),
        Source(
            key="greix_rent_vs_sales",
            folder="greix",
            filename="City_Metrics_rents_sales-Mietpreis-Transaktionspreisindex.xlsx",
            url=(
                "https://www.kielinstitut.de/fileadmin/Dateiverwaltung/IfW_Unit/Macroeconomics/"
                "GREIX/Mietpreisindex/City_Metrics_rents_sales-Mietpreis-Transaktionspreisindex.xlsx"
            ),
            licence=(
                "Published free of charge by the Kiel Institute with attribution requested; redistribution "
                "terms not confirmed"
            ),
            publisher="GREIX Miet- und Transaktionspreisindex, Kiel Institut für Weltwirtschaft",
            licence_url="https://www.kielinstitut.de/de/forschung/forschungszentren/makrooekonomie/greix/",
            release_note="Quarterly, same URL.",
        ),
        Source(
            key="bundesbank_mortgage_rate",
            folder="bundesbank",
            filename="BBIM1.M.DE.B.A2C.A.R.A.2250.EUR.N.csv",
            url=(
                "https://api.statistiken.bundesbank.de/rest/download/BBIM1/"
                "M.DE.B.A2C.A.R.A.2250.EUR.N?format=csv&lang=en"
            ),
            licence="Deutsche Bundesbank, free use with attribution",
            publisher="Deutsche Bundesbank, MFI interest rate statistics (SUD131Z)",
            licence_url="https://www.bundesbank.de/en/statistics/time-series-databases/help-for-sdmx-web-service/terms-of-use",
            release_note="Monthly, about five weeks after the month ends.",
        ),
        Source(
            key="geo_kreise",
            folder="geo",
            filename="kreise_vg5000.geojson",
            # Pinned to a commit and a checksum (SEC-3): a third-party repo must not be able to change production data.
            url=(
                "https://raw.githubusercontent.com/Praesklepios/geoGermany/"
                "f3aa3a59290aea47cdcb2f15aa3cb427eb28b1cd/geojson/Ebene_Kreise.geojson"
            ),
            licence="© GeoBasis-DE / BKG (VG5000, Stand 01.01.2021), dl-de/by-2-0",
            publisher="Bundesamt für Kartographie und Geodäsie via Praesklepios/geoGermany",
            licence_url="https://www.govdata.de/dl-de/by-2-0",
            sha256="9b00382dbe31ddb10b9ce5847ec6b5eeb844550787d97ae951191566079b1cf7",
            release_note=(
                "Fixed 2021 vintage (401 polygons incl. Eisenach). Moving to BKG VG5000 2024 is tracked "
                "in docs/RUNBOOK.md."
            ),
        ),
    ]
}


def raw_path(source: Source | str) -> Path:
    source = SOURCES[source] if isinstance(source, str) else source
    return RAW_DIR / source.folder / source.filename


def city_kreis_codes() -> set[str]:
    """AGS of the Kreise that contain a GREIX city (single source of truth: the dbt seed)."""
    import csv

    with open(PROJECT_ROOT / "dbt" / "seeds" / "city_kreis_map.csv", encoding="utf-8") as fh:
        return {row["ags"] for row in csv.DictReader(fh)}
