"""Grounding and meaning checks for AI summaries (ML-9) and the bounded cache (SWE-5)."""

from __future__ import annotations

import time

from api import summary

FACTS = {
    "city": "Berlin",
    "rank_by_asking_rent_1_is_most_expensive": 6,
    "cities_compared": 37,
    "yoy_change_pct": -2.0,
    "five_year_change_pct": 29.5,
    "median_asking_rent_eur_sqm": 15.18,
    "forecast_interval_pct": 80,
    "five_years": 5,
}


def test_percentages_must_match_percentage_facts():
    # 5 is a fact (five years), but "5 %" is not a percentage the facts contain
    assert summary.ungrounded_numbers("over 5 years rents rose 5%", FACTS) == ["5%"]
    assert summary.ungrounded_numbers("down 2.0% on the year, +29.5% over five years", FACTS) == []


def test_meaning_checks_catch_wrong_rank_and_direction():
    p = summary.meaning_problems("Berlin ranks 6th among the 37 most expensive markets; rents rose 2%.", FACTS)
    assert any("among the 37" in x for x in p) and any("rose" in x for x in p)
    assert summary.meaning_problems("Berlin is the 4th most expensive city.", FACTS) == [
        "ordinal 4th but the rank is 6"
    ]
    assert summary.meaning_problems("Berlin is the 6th most expensive city; rents fell 2.0%.", FACTS) == []


def test_facts_hash_is_stable_and_sensitive():
    assert summary.facts_hash(FACTS) == summary.facts_hash(dict(reversed(list(FACTS.items()))))
    assert summary.facts_hash(FACTS) != summary.facts_hash({**FACTS, "yoy_change_pct": -2.1})


def test_ttl_cache_is_bounded_and_expires():
    c = summary._TTLCache(maxsize=2, ttl=0.05)
    c.set("a", 1)
    c.set("b", 2)
    c.set("c", 3)
    assert c.get("a") is None and c.get("c") == 3
    time.sleep(0.06)
    assert c.get("c") is None


def test_german_number_format():
    assert summary._de(1394.5) == "1.394,50" and summary._de(15.18) == "15,18" and summary._de(-2.0, 1) == "-2,0"
