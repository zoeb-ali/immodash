"""Fail when a Markdown file links to a repository file that does not exist (OPS-7).

Checks relative links in every tracked *.md file (README, docs/, ADRs, CONTRIBUTING, ...). External links are
not fetched here, so the check is fast and needs no network."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
# file paths written as inline code, e.g. `docs/RUNBOOK.md`, must exist too (history files may name removed ones)
CODE_PATH = re.compile(
    r"`((?:docs|scripts|api|ml|dbt|ingestion|tests|flows|deploy|\.github)/[\w./-]+\.(?:md|py|yml|yaml|sql|toml))`"
)
HISTORY_FILES = {"CHANGELOG.md"}
SKIP_DIRS = {"node_modules", ".venv", "dbt_packages", "target", ".private", ".agents"}


def markdown_files() -> list[Path]:
    try:
        out = subprocess.run(["git", "ls-files", "*.md"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        files = [ROOT / f for f in out.splitlines()]
    except (subprocess.CalledProcessError, FileNotFoundError):
        files = list(ROOT.rglob("*.md"))
    return [f for f in files if f.exists() and not SKIP_DIRS & set(f.relative_to(ROOT).parts)]


def main() -> int:
    broken = []
    for md in markdown_files():
        text = re.sub(r"```.*?```", "", md.read_text(encoding="utf-8"), flags=re.S)  # ignore code blocks
        for target in LINK.findall(text):
            if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                continue
            path = target.split("#", 1)[0]
            if path and not (md.parent / path).resolve().exists():
                broken.append(f"{md.relative_to(ROOT)}: {target}")
        if md.name in HISTORY_FILES or "audit" in md.parent.name.lower():
            continue
        for target in CODE_PATH.findall(text):
            if not (ROOT / target).exists() and "*" not in target:
                broken.append(f"{md.relative_to(ROOT)}: `{target}`")
    for b in broken:
        print(f"broken link  {b}")
    print(f"{len(broken)} broken relative links")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
