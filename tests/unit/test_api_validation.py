"""Input validation and API hardening (SEC-5, SEC-6, SWE-5). These requests are rejected before any query runs,
so no warehouse is needed."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


@pytest.mark.parametrize(
    "path",
    [
        "/kreise/abc/rents",
        "/kreise/1234/asking-rents",
        "/v1/kreise/123456/grid",
        "/postcodes/rents?ags=12",
        "/kreise/rents-by-size?ags=x",
        "/geo/kreise?simplify=0.5",
        "/affordability/finder?budget_eur=700&size_band=WFL999",
        "/kreise/rents?rooms=12",
    ],
)
def test_bad_input_is_422(path):
    assert client.get(path).status_code == 422


def test_public_summary_route_has_no_llm_switch():
    params = {p["name"] for p in app.openapi()["paths"]["/v1/cities/{city}/summary"]["get"].get("parameters", [])}
    assert params == {"city"}


def test_versioned_routes_are_documented_and_aliases_hidden():
    paths = app.openapi()["paths"]
    assert all(p.startswith("/v1/") for p in paths)
    assert "/v1/meta/freshness" in paths and "/v1/validation/asking-estimate" in paths


def test_cors_is_not_a_wildcard_by_default():
    r = client.options("/v1/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") != "*"
