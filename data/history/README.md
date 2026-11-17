# data/history

Append-only records written by the weekly refresh (`.github/workflows/refresh-site.yml`), committed with the data:

| File | One row per | Written by |
|---|---|---|
| `ingest_log.csv` | source and run: status (downloaded, unchanged, fallback, manual), SHA-256, size, Last-Modified, consecutive fallbacks, error | `python -m immodash_ingest` |
| `bronze_volumes.csv` | bronze table and run: row count and change against the previous run | `python -m immodash_ingest` |
| `forecasts.csv` | published forecast (origin month, horizon, city, model version): kept so real accuracy can be measured once the target month has passed | `python -m ml` with `IMMODASH_RECORD_HISTORY=1` |
| `model_cards.csv` | training run: features, parameters, seed, back-test results | `python -m ml` with `IMMODASH_RECORD_HISTORY=1` |

Never edit these by hand. Local and CI runs (`--offline`, tests) do not write here.
