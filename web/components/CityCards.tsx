"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cityName } from "@/lib/i18n";
import { useI18n } from "@/lib/useLang";

export type CardCity = { slug: string; city: string; city_en: string; land: string | null; median: number; yoy: number | null;
  burden: number | null; spark: number[] };
type Sort = "rent" | "rise" | "afford" | "name";

function Spark({ v }: { v: number[] }) {
  if (v.length < 2) return null;
  const W = 200, H = 36, lo = Math.min(...v), hi = Math.max(...v);
  const pts = v.map((y, i) => `${(i / (v.length - 1)) * W},${H - 2 - ((y - lo) / (hi - lo || 1)) * (H - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", margin: "6px 0 2px" }}>
      <polyline points={pts} fill="none" stroke="var(--s1)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function CityCards({ cities }: { cities: CardCity[] }) {
  const { lang, t, f, to } = useI18n();
  const { eur, pct } = f;
  const nm = (c: CardCity) => cityName(lang, c);
  const [sort, setSort] = useState<Sort>("rent");
  const [q, setQ] = useState("");
  const view = useMemo(() => {
    const f = cities.filter((c) => `${c.city} ${c.city_en} ${c.land ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
    const by: Record<Sort, (a: CardCity, b: CardCity) => number> = {
      rent: (a, b) => b.median - a.median,
      rise: (a, b) => (b.yoy ?? -99) - (a.yoy ?? -99),
      afford: (a, b) => (a.burden ?? 99) - (b.burden ?? 99),
      name: (a, b) => nm(a).localeCompare(nm(b), lang),
    };
    return f.sort(by[sort]);
  }, [cities, sort, q, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div className="controls" style={{ marginBottom: 16, justifyContent: "space-between" }}>
        <div className="field" style={{ flex: "1 1 220px", maxWidth: 320 }}>
          <label htmlFor="cc-q">{t("Find a city", "Stadt suchen")}</label>
          <input id="cc-q" type="search" placeholder={t("e.g. Köln or Sachsen", "z. B. Köln oder Sachsen")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg" role="group" aria-label={t("Sort cities", "Städte sortieren")}>
          {([["rent", t("Most expensive", "Am teuersten")], ["rise", t("Rising fastest", "Am stärksten steigend")], ["afford", t("Most affordable", "Am bezahlbarsten")], ["name", t("A to Z", "A bis Z")]] as [Sort, string][]).map(([k, l]) => (
            <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="citygrid">
        {view.map((c) => (
          <Link key={c.slug} href={to(`/cities/${c.slug}`)} className="citycard">
            <div className="cc-top"><b>{nm(c)}</b><span className="cc-v">{eur(c.median)}</span></div>
            <span className="cc-s">{c.land} · {t("per m² asking rent", "Angebotsmiete pro m²")}</span>
            <Spark v={c.spark} />
            <span className="cc-s">
              <span className={(c.yoy ?? 0) >= 0 ? "up" : "down"}>{pct(c.yoy, 1, true)}</span> {t("in a year · burden", "in einem Jahr · Belastung")} {pct(c.burden)}
            </span>
          </Link>
        ))}
      </div>
      {view.length === 0 && <p className="note">{t(`No city matches “${q}”.`, `Keine Stadt passt zu „${q}“.`)}</p>}
    </div>
  );
}
