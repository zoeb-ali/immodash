"""ImmoDash ingestion: acquire public German housing data and land it in the bronze layer."""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("immodash")
except PackageNotFoundError:  # running from a source checkout without `pip install -e .`
    __version__ = "0+local"
