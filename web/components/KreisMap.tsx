"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { loadJson } from "@/lib/api";
import { balance, href } from "@/lib/i18n";
import { useI18n } from "@/lib/useLang";
import { MAP_H, MAP_W, useKreisPaths } from "@/lib/geo";
import { useTokens } from "@/lib/theme";
import type { KreisAffordability, KreisAskingRent, KreisSupplyDemand } from "@/lib/types";

type Metric = "asking" | "afford" | "sd" | "rent";
type MetricText = Record<Metric, { label: string; what: string; low: string; high: string }>;
const METRICS_ALL: Record<"en" | "de", MetricText> = {
  en: {
    asking: { label: "Rent today", what: "Estimated asking rent per m² for a new lease today. Measured in 37 cities, modelled elsewhere.", low: "cheaper", high: "dearer" },
    afford: { label: "Affordability", what: "Rent for 60 m² against what two residents earn after tax. Red: rent takes a large share of local income. Blue: a small share.", low: "rent takes more of income", high: "rent takes less" },
    sd: { label: "Supply vs. demand", what: "Red: population growing while almost no flats are empty (tight). Blue: many empty flats and little growth (slack).", low: "slack", high: "tight" },
    rent: { label: "Rent in 2022", what: "Average rent on existing leases in the 2022 census, per m².", low: "cheaper", high: "dearer" },
  },
  de: {
    asking: { label: "Miete heute", what: "Geschätzte Angebotsmiete pro m² für einen Neuvertrag heute. In 37 Städten gemessen, sonst modelliert.", low: "günstiger", high: "teurer" },
    afford: { label: "Bezahlbarkeit", what: "Miete für 60 m² im Verhältnis zum Nettoeinkommen zweier Einwohner. Rot: Die Miete nimmt einen großen Teil des örtlichen Einkommens. Blau: einen kleinen.", low: "Miete nimmt mehr vom Einkommen", high: "Miete nimmt weniger" },
    sd: { label: "Angebot vs. Nachfrage", what: "Rot: Die Bevölkerung wächst, während kaum Wohnungen leer stehen (angespannt). Blau: viele leere Wohnungen und wenig Wachstum (entspannt).", low: "entspannt", high: "angespannt" },
    rent: { label: "Miete 2022", what: "Durchschnittliche Miete laufender Verträge laut Zensus 2022, pro m².", low: "günstiger", high: "teurer" },
  },
};
const RAMPS: Record<Metric, string[]> = {
  asking: ["--q1", "--q2", "--q3", "--q4", "--q5"],
  rent: ["--q1", "--q2", "--q3", "--q4", "--q5"],
  afford: ["--d-neg2", "--d-neg1", "--d-mid", "--d-pos1", "--d-pos2"],
  sd: ["--d-pos2", "--d-pos1", "--d-mid", "--d-neg1", "--d-neg2"],
};
const TOKENS = ["--d-neg2", "--d-neg1", "--d-mid", "--d-pos1", "--d-pos2", "--q1", "--q2", "--q3", "--q4", "--q5", "--surface", "--ink"];

export function KreisMap({ afford, sd, asking, citySlugs }: {
  afford: KreisAffordability[]; sd: KreisSupplyDemand[]; asking: KreisAskingRent[]; citySlugs: Record<string, string>;
}) {
  const { lang, t, f } = useI18n();
  const { eur, num, ordinal, pct } = f;
  const METRICS = METRICS_ALL[lang];
  const [metric, setMetric] = useState<Metric>("asking");
  const [sel, setSel] = useState<string>("05711");
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  const [rooms, setRooms] = useState<KreisAskingRent[] | null>(null);
  const paths = useKreisPaths();
  const tk = useTokens(TOKENS);

  const byAgs = useMemo(() => {
    const m: Record<string, { a?: KreisAffordability; s?: KreisSupplyDemand; r?: KreisAskingRent }> = {};
    afford.forEach((a) => ((m[a.ags] ??= {}).a = a));
    sd.forEach((s) => ((m[s.ags] ??= {}).s = s));
    asking.forEach((r) => ((m[r.ags] ??= {}).r = r));
    return m;
  }, [afford, sd, asking]);
  const names = useMemo(() => afford.map((a) => ({ ags: a.ags, name: a.kreis_name })).sort((a, b) => a.name.localeCompare(b.name)), [afford]);
  const askRank = useMemo(() => Object.fromEntries([...asking].sort((a, b) => b.estimated_asking_rent_eur_sqm - a.estimated_asking_rent_eur_sqm).map((r, i) => [r.ags, i + 1])), [asking]);

  const value = (a: string): number | null => {
    const k = byAgs[a];
    if (metric === "afford") return k?.a?.affordability_index ?? null;
    if (metric === "sd") return k?.s?.supply_demand_index ?? null;
    if (metric === "rent") return k?.r?.rent_eur_sqm ?? null;
    return k?.r?.estimated_asking_rent_eur_sqm ?? null;
  };
  const scale = useMemo(() => {
    if (metric === "afford") return { domain: [50, 75, 100, 125, 150], lo: "50", hi: "150" };
    if (metric === "sd") return { domain: [-3, -1.5, 0, 1.5, 3], lo: "−3", hi: "+3" };
    const n1 = (v: number) => v.toLocaleString(lang === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const vals = asking.map((r) => (metric === "rent" ? r.rent_eur_sqm : r.estimated_asking_rent_eur_sqm)).sort((x, y) => x - y);
    const lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.floor(vals.length * 0.98)];
    return { domain: [0, 0.25, 0.5, 0.75, 1].map((p) => lo + p * (hi - lo)), lo: `${n1(lo)} €`, hi: `${n1(hi)} €` };
  }, [metric, asking, lang]);
  const color = useMemo(() => {
    if (!tk["--q1"]) return () => "transparent";
    const s = scaleLinear<string>().domain(scale.domain).range(RAMPS[metric].map((k) => tk[k])).clamp(true);
    return (a: string) => { const v = value(a); return v == null ? tk["--surface"] : s(v); };
  }, [metric, scale, tk, byAgs]);

  useEffect(() => {
    setRooms(null);
    loadJson<KreisAskingRent[]>("kreise-asking-rents.json")
      .then((all) => setRooms(all.filter((r) => r.ags === sel && r.rooms !== "total")
        .sort((a, b) => (a.rooms === "7+" ? 7 : Number(a.rooms)) - (b.rooms === "7+" ? 7 : Number(b.rooms)))))
      .catch(() => setRooms([]));
  }, [sel]);

  function search(v: string) {
    setQ(v);
    const hit = names.find((n) => n.name.toLowerCase() === v.trim().toLowerCase()) ?? (v.trim().length >= 3 ? names.find((n) => n.name.toLowerCase().startsWith(v.trim().toLowerCase())) : undefined);
    if (hit) setSel(hit.ags);
  }

  const s = byAgs[sel];
  const h = hover ? byAgs[hover.ags] : null;
  const nm = s?.a?.kreis_name.split(",")[0] ?? "";

  return (
    <div className="split">
      <div>
        <div className="controls" style={{ marginBottom: 10 }}>
          <div className="seg" role="group" aria-label={t("Map shows", "Karte zeigt")}>
            {(Object.keys(METRICS) as Metric[]).map((m) => (
              <button key={m} aria-pressed={m === metric} onClick={() => setMetric(m)}>{METRICS[m].label}</button>
            ))}
          </div>
          <div className="field" style={{ flex: "1 1 200px" }}>
            <input type="search" list="kreis-names" placeholder={t("Search a district, e.g. Bielefeld", "Kreis suchen, z. B. Bielefeld")} aria-label={t("Search a district", "Kreis suchen")} value={q} onChange={(e) => search(e.target.value)} />
            <datalist id="kreis-names">{names.map((n) => <option key={n.ags} value={n.name} />)}</datalist>
          </div>
        </div>
        <p className="figure-sub" style={{ marginBottom: 8 }}>{METRICS[metric].what}</p>
        <div className="legend" style={{ marginBottom: 6 }}>
          <span>{scale.lo} · {METRICS[metric].low}</span>
          <span className="bar" style={{ background: `linear-gradient(90deg, ${RAMPS[metric].map((k) => tk[k]).join(",")})` }} />
          <span>{scale.hi} · {METRICS[metric].high}</span>
        </div>
        <div className="mapwrap" onMouseLeave={() => setHover(null)}>
          {paths ? (
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", maxHeight: 740, display: "block" }} role="img" aria-label={`${t("Map of German districts", "Karte der deutschen Kreise")}: ${METRICS[metric].label}`}>
              {paths.map((p) => (
                <path key={p.ags + p.d.length} className="k" d={p.d} fill={color(p.ags)} stroke={tk["--surface"]} strokeWidth={0.5}
                  onClick={() => { setSel(p.ags); setQ(""); }}
                  onMouseMove={(e) => {
                    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setHover({ ags: p.ags, x: e.clientX - r.left, y: e.clientY - r.top });
                  }} />
              ))}
              {paths.filter((p) => p.ags === sel).map((p) => (
                <g key="sel" pointerEvents="none">
                  <path d={p.d} fill="none" stroke={tk["--ink"]} strokeWidth={2.2} />
                </g>
              ))}
            </svg>
          ) : <p className="note">{t("Loading map…", "Karte wird geladen…")}</p>}
          {hover && h?.a && (
            <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 14, 300), top: hover.y + 14, pointerEvents: "none" }}>
              <b>{h.a.kreis_name.split(",")[0]}</b> <span className="tt-k">{h.a.land_name}</span><br />
              {t("Today about", "Heute etwa")} {eur(h.r?.estimated_asking_rent_eur_sqm)}/m² · {t("2022 leases", "Bestand 2022")} {eur(h.a.rent_eur_sqm)}<br />
              <span className="tt-k">{t("Affordability", "Bezahlbarkeit")} {num(h.a.affordability_index)} · {t("market", "Markt")} {balance(lang, h.s?.market_balance)}</span>
            </div>
          )}
        </div>
        <p className="note" style={{ marginTop: 6 }}>{t("Hover for values, click or search to read about a district.", "Für Werte darüberfahren, für Details klicken oder suchen.")}</p>
      </div>

      <aside className="card">
        {s?.a ? (
          <>
            <div className="meta">{s.a.land_name} · {s.a.is_urban_district ? t("City district", "Kreisfreie Stadt") : t("Rural district", "Landkreis")}</div>
            <h3 style={{ fontSize: 26, margin: "4px 0 10px" }}>{nm}</h3>
            <div className="prose" style={{ fontSize: 17 }}>
              {t(<>
              <p>A new lease here is estimated at <b>{eur(s.r?.estimated_asking_rent_eur_sqm)}</b> per m²
                {askRank[sel] && <> ({ordinal(askRank[sel])} most expensive of 400)</>}, so about{" "}
                <b>{num(Math.round(((s.r?.estimated_asking_rent_eur_sqm ?? 0) * 60) / 10) * 10)} €</b> a month for 60 m², cold.
                Existing leases averaged {eur(s.a.rent_eur_sqm)} in 2022.</p>
              <p>Rent on existing leases takes <b>{pct(s.a.rent_burden_pct)}</b> of two average residents&apos; net income, which makes {nm}{" "}
                {s.a.affordability_index >= 110 ? "more affordable than most of Germany" : s.a.affordability_index <= 90 ? "less affordable than most of Germany" : "about as affordable as the German middle"}{" "}
                (index {num(s.a.affordability_index)}, rank {s.a.affordability_rank} of 400).</p>
              {s.s && <p>The market is <b>{balance(lang, s.s.market_balance)}</b>: {pct(s.s.market_active_vacancy_pct)} of flats stood empty and available, and the
                population {s.s.population_growth_5y_pct >= 0 ? "grew" : "shrank"} {pct(Math.abs(s.s.population_growth_5y_pct))} in five years.</p>}
              </>, <>
              <p>Ein Neuvertrag wird hier auf <b>{eur(s.r?.estimated_asking_rent_eur_sqm)}</b> pro m² geschätzt
                {askRank[sel] && <> (Platz {askRank[sel]} der teuersten von 400)</>}, also etwa{" "}
                <b>{num(Math.round(((s.r?.estimated_asking_rent_eur_sqm ?? 0) * 60) / 10) * 10)} €</b> im Monat für 60 m², kalt.
                Bestandsverträge lagen 2022 im Schnitt bei {eur(s.a.rent_eur_sqm)}.</p>
              <p>Die Bestandsmiete nimmt <b>{pct(s.a.rent_burden_pct)}</b> vom Nettoeinkommen zweier durchschnittlicher Einwohner. Damit ist {nm}{" "}
                {s.a.affordability_index >= 110 ? "bezahlbarer als der Großteil Deutschlands" : s.a.affordability_index <= 90 ? "weniger bezahlbar als der Großteil Deutschlands" : "etwa so bezahlbar wie die deutsche Mitte"}{" "}
                (Index {num(s.a.affordability_index)}, Rang {s.a.affordability_rank} von 400).</p>
              {s.s && <p>Der Markt ist <b>{balance(lang, s.s.market_balance)}</b>: {pct(s.s.market_active_vacancy_pct)} der Wohnungen standen leer und waren verfügbar, und die
                Bevölkerung ist in fünf Jahren um {pct(Math.abs(s.s.population_growth_5y_pct))} {s.s.population_growth_5y_pct >= 0 ? "gewachsen" : "geschrumpft"}.</p>}
              </>)}
            </div>
            {citySlugs[sel] && <p style={{ margin: "4px 0 12px" }}><Link className="btn" href={href(lang, `/cities/${citySlugs[sel]}`)}>{t("Full city profile", "Vollständiges Stadtprofil")} <ArrowRight size={15} weight="bold" aria-hidden /></Link></p>}
            <p className="figure-title" style={{ fontSize: 14, marginTop: 6 }}>{t("By number of rooms", "Nach Zimmerzahl")}</p>
            <p className="note">{t("Rent per m², 2022 leases vs. estimated new lease today", "Miete pro m², Bestand 2022 und geschätzter Neuvertrag heute")}</p>
            <div style={{ height: 200, marginTop: 6 }}>
              {rooms && rooms.length > 0 && (
                <ResponsiveContainer>
                  <BarChart data={rooms} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
                    <XAxis dataKey="rooms" tickFormatter={(v) => t(`${v} rm`, `${v} Zi.`)} stroke="var(--muted)" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} €`} width={40} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="tooltip"><b>{t(`${label} room${label === "1" ? "" : "s"}`, `${label} Zimmer`)}</b><br />{t("2022 leases", "Bestand 2022")}: {num(Number(payload[0].value), 2)} €/m²<br />
                        {t("New lease today", "Neuvertrag heute")}: {num(Number(payload[1]?.value), 2)} €/m²</div>) : null} />
                    <Bar dataKey="rent_eur_sqm" fill="var(--s3)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="estimated_asking_rent_eur_sqm" fill="var(--s2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="legend">
              <span className="key"><span className="sw" style={{ background: "var(--s3)" }} />{t("2022 leases", "Bestand 2022")}</span>
              <span className="key"><span className="sw" style={{ background: "var(--s2)" }} />{t("New lease today (est.)", "Neuvertrag heute (gesch.)")}</span>
            </div>
          </>
        ) : <p className="note">{t("Select a district on the map.", "Wählen Sie einen Kreis auf der Karte.")}</p>}
      </aside>
    </div>
  );
}
