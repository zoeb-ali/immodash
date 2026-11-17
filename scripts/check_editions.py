"""Look for newer editions of sources whose download URL contains the edition (audit DE-6).

The VGRdL income workbook URL names its edition (`.../2026-01/vgrdl_r2b3_bs2024.xlsx`), so the weekly download
keeps fetching the old file even after a new Berechnungsstand is published. This script reads the publisher's
page, finds the newest `vgrdl_r2b3_bs<YEAR>.xlsx` it links to and fails (exit 1) when it is newer than the one
configured. The monitor workflow runs it weekly and opens a GitHub issue when it fails.

    python scripts/check_editions.py
"""

from __future__ import annotations

import re
import sys

import requests

from immodash_ingest.config import SOURCES
from immodash_ingest.http import USER_AGENT

CHECKS = [
    {
        "source": "vgrdl_income",
        "page": "https://www.statistikportal.de/de/vgrdl/ergebnisse-kreisebene/einkommen-kreise",
        "pattern": r"vgrdl_r2b3_bs(\d{4})\.xlsx",
    },
]


def main() -> int:
    newer = []
    for c in CHECKS:
        configured = re.search(c["pattern"], SOURCES[c["source"]].url or "")
        current = int(configured.group(1)) if configured else 0
        try:
            html = requests.get(c["page"], headers={"User-Agent": USER_AGENT}, timeout=30).text
        except requests.RequestException as exc:
            print(f"::warning::{c['source']}: could not read {c['page']} ({exc}); check by hand")
            continue
        found = sorted({int(y) for y in re.findall(c["pattern"], html)})
        latest = found[-1] if found else None
        print(f"{c['source']}: configured edition {current}, newest linked {latest}")
        if latest and latest > current:
            newer.append(
                f"{c['source']}: edition {latest} is available (configured {current}); "
                f"update the URL in ingestion/immodash_ingest/config.py"
            )
    for n in newer:
        print(f"::error::{n}")
    return 1 if newer else 0


if __name__ == "__main__":
    sys.exit(main())
