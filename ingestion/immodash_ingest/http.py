"""Small, polite HTTP downloader with retries, a size cap and optional checksum pinning."""

from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass
from pathlib import Path

import requests

from . import __version__

log = logging.getLogger(__name__)
USER_AGENT = f"ImmoDash/{__version__} (+https://github.com/zoeb-ali/immodash; open-data research project)"
DEFAULT_MAX_BYTES = 200 * 1024 * 1024  # largest source today is ~10 MB; anything near this is not what we expect


class DownloadRejected(Exception):
    """The server answered, but the file must not be used (too large, wrong type or checksum)."""


@dataclass(frozen=True)
class Downloaded:
    path: Path
    sha256: str
    bytes: int
    last_modified: str | None


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(
    url: str,
    dest: Path,
    *,
    retries: int = 3,
    timeout: int = 60,
    max_bytes: int = DEFAULT_MAX_BYTES,
    expect_sha256: str | None = None,
    reject_content_types: tuple[str, ...] = ("text/html",),
) -> Downloaded:
    """Download `url` to `dest` atomically.

    The new file only replaces `dest` when it is under `max_bytes`, is not an HTML error page and, when
    `expect_sha256` is given, matches that checksum. Network errors are retried; a rejected file is not.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout, stream=True) as r:
                r.raise_for_status()
                ctype = r.headers.get("Content-Type", "").split(";")[0].strip().lower()
                if ctype in reject_content_types:
                    raise DownloadRejected(f"{url} returned {ctype}, not a data file")
                declared = int(r.headers.get("Content-Length") or 0)
                if declared > max_bytes:
                    raise DownloadRejected(f"{url} declares {declared} bytes, over the {max_bytes} limit")
                h, size = hashlib.sha256(), 0
                with open(tmp, "wb") as fh:
                    for chunk in r.iter_content(chunk_size=1 << 16):
                        size += len(chunk)
                        if size > max_bytes:
                            raise DownloadRejected(f"{url} exceeded the {max_bytes} byte limit")
                        h.update(chunk)
                        fh.write(chunk)
                digest = h.hexdigest()
                if expect_sha256 and digest != expect_sha256:
                    raise DownloadRejected(
                        f"{url} checksum {digest[:12]}… does not match the pinned {expect_sha256[:12]}…"
                    )
                last_modified = r.headers.get("Last-Modified")
            tmp.replace(dest)
            log.info("downloaded %s -> %s (%d bytes)", url, dest, size)
            return Downloaded(dest, digest, size, last_modified)
        except DownloadRejected:
            tmp.unlink(missing_ok=True)
            raise
        except requests.RequestException as exc:  # pragma: no cover - network dependent
            last_exc = exc
            log.warning("download attempt %d/%d failed for %s: %s", attempt, retries, url, exc)
            time.sleep(2**attempt)
    tmp.unlink(missing_ok=True)
    assert last_exc is not None
    raise last_exc
