"""One version everywhere (DE-10, SWE-8): pyproject, dbt project, web package and the latest changelog release
must agree. Run in CI; bump all of them together when releasing."""

from __future__ import annotations

import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def versions() -> dict[str, str]:
    py = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]["version"]
    dbt = re.search(r'^version:\s*"?([\d.]+)"?', (ROOT / "dbt" / "dbt_project.yml").read_text(), re.M).group(1)
    web = json.loads((ROOT / "web" / "package.json").read_text())["version"]
    log = re.search(r"^## \[(\d+\.\d+\.\d+)\]", (ROOT / "CHANGELOG.md").read_text(), re.M).group(1)
    return {
        "pyproject.toml": py,
        "dbt/dbt_project.yml": dbt,
        "web/package.json": web,
        "CHANGELOG.md (latest release)": log,
    }


def main() -> int:
    v = versions()
    for k, val in v.items():
        print(f"{k:<32} {val}")
    if len(set(v.values())) != 1:
        print("Versions differ: bump them together (see CONTRIBUTING.md, Releasing).")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
