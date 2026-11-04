# Documentation index

Start here when you take over ImmoDash. Read in this order:

| # | Document | What it answers |
|---|---|---|
| 1 | [`../README.md`](../README.md) | What the project is, how to run it, what the site shows |
| 2 | [`RUNBOOK.md`](RUNBOOK.md) | How production runs, health checks, what to do when something breaks |
| 3 | [`DATA_DICTIONARY.md`](DATA_DICTIONARY.md) | Every table and column, with units and tests (generated) |
| 4 | [`data_sources.md`](data_sources.md) | Where each raw file comes from, licence, refresh cadence |
| 5 | [`adr/`](adr/) | Why the big decisions were made (0001 to 0009, template in 0000) |
| 6 | [`../CHANGELOG.md`](../CHANGELOG.md) | What changed in each version |
| 7 | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | How to make a change and what to update with it |
| 8 | [`DEPLOYMENT.md`](DEPLOYMENT.md) | Setting up GitHub, Vercel and the weekly refresh from scratch |
| 9 | [`../PRODUCT.md`](../PRODUCT.md), [`../DESIGN.md`](../DESIGN.md) | Who the site is for and its design system |

Supporting files: `codebook/columns.yml` (column definitions behind the data dictionary), `img/` (screenshots).

The maintainer also keeps a private handoff with account details and working notes in `.private/HANDOFF.md`
(git-ignored, not in the repository).
