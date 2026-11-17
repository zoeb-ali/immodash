"""Downloader hardening (SEC-3): size cap, checksum pin and HTML error pages are rejected."""

from __future__ import annotations

import hashlib

import pytest

from immodash_ingest import http


class FakeResponse:
    def __init__(self, body: bytes, ctype: str = "application/octet-stream", length: bool = True):
        self.body, self.headers = body, {"Content-Type": ctype, "Last-Modified": "Mon, 02 Nov 2026 10:00:00 GMT"}
        if length:
            self.headers["Content-Length"] = str(len(body))

    def raise_for_status(self) -> None:
        pass

    def iter_content(self, chunk_size: int):
        for i in range(0, len(self.body), chunk_size):
            yield self.body[i : i + chunk_size]

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


@pytest.fixture
def serve(monkeypatch):
    def _serve(resp: FakeResponse):
        monkeypatch.setattr(http.requests, "get", lambda *a, **k: resp)

    return _serve


def test_download_writes_file_and_reports_checksum(tmp_path, serve):
    body = b"a,b\n1,2\n"
    serve(FakeResponse(body))
    d = http.download("https://example.org/x.csv", tmp_path / "x.csv")
    assert d.path.read_bytes() == body
    assert d.sha256 == hashlib.sha256(body).hexdigest() and d.bytes == len(body)
    assert d.last_modified.startswith("Mon")


def test_size_cap_rejects_and_keeps_previous_file(tmp_path, serve):
    dest = tmp_path / "x.csv"
    dest.write_bytes(b"old")
    serve(FakeResponse(b"x" * 2000, length=False))
    with pytest.raises(http.DownloadRejected):
        http.download("https://example.org/x.csv", dest, max_bytes=1000)
    assert dest.read_bytes() == b"old"
    assert not (tmp_path / "x.csv.part").exists()


def test_declared_length_over_cap_is_rejected_before_reading(tmp_path, serve):
    serve(FakeResponse(b"x" * 2000))
    with pytest.raises(http.DownloadRejected, match="declares"):
        http.download("https://example.org/x.csv", tmp_path / "x.csv", max_bytes=1000)


def test_checksum_pin(tmp_path, serve):
    serve(FakeResponse(b"changed upstream"))
    with pytest.raises(http.DownloadRejected, match="checksum"):
        http.download("https://example.org/geo.json", tmp_path / "geo.json", expect_sha256="0" * 64)


def test_html_error_page_is_rejected(tmp_path, serve):
    serve(FakeResponse(b"<html>Not found</html>", ctype="text/html"))
    with pytest.raises(http.DownloadRejected, match="text/html"):
        http.download("https://example.org/data.xlsx", tmp_path / "data.xlsx")
