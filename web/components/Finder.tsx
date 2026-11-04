"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { loadJson } from "@/lib/api";
import { useI18n } from "@/lib/useLang";
import { MAP_H, MAP_W, useKreisPaths } from "@/lib/geo";
import { useTokens } from "@/lib/theme";
import type { KreisAffordability, KreisAskingRent } from "@/lib/types";

type SizeRow = { ags: string; kreis_name: string; size_band_code: string; rent_eur_sqm: number;
  estimated_asking_rent_eur_sqm: number | null; estimate_method: string | null };
type Hit = { ags: string; name: string; land: string | null; urban: boolean; est: number; rent: number; headroom: number; pop: number | null; method: string;
  lo: number | null; hi: number | null };
type Range = { ags: string; resolution_m: number; p10_index: number; p90_index: number };
type Postcode = { ags: string; plz: string; cells: number; rent_index_vs_kreis: number };
const r10 = (v: number) => Math.round(v / 10) * 10;

const SEGMENTS: { value: string; label: [string, string]; rooms?: string; band?: string }[] = [
  { value: "total", label: ["Any flat", "Jede Wohnung"], rooms: "total" },
  ...[1, 2, 3, 4].map((n) => ({ value: `r${n}`, label: [`${n} room${n > 1 ? "s" : ""}`, `${n} Zimmer`] as [string, string], rooms: String(n) })),
  { value: "s1", label: ["Under 40 m²", "Unter 40 m²"], band: "WFL000B039" },
  { value: "s2", label: ["40 to 59 m²", "40 bis 59 m²"], band: "WFL040B059" },
  { value: "s3", label: ["60 to 79 m²", "60 bis 79 m²"], band: "WFL060B079" },
  { value: "s4", label: ["80 to 99 m²", "80 bis 99 m²"], band: "WFL080B099" },
  { value: "s5", label: ["100 to 119 m²", "100 bis 119 m²"], band: "WFL100B119" },
];
const sizeToSeg = (s: number) => (s < 40 ? "s1" : s < 60 ? "s2" : s < 80 ? "s3" : s < 100 ? "s4" : "s5");
const METHOD: Record<string, [string, string]> = {
  greix_city: ["using this city's own observed gap between census and asking rents", "mit der in dieser Stadt beobachteten Lücke zwischen Zensus- und Angebotsmieten"],
  greix_land_median: ["using the typical gap seen in the tracked cities of its federal state", "mit der typischen Lücke in den erfassten Städten seines Bundeslands"],
  greix_national_median: ["using the typical gap across all tracked cities", "mit der typischen Lücke über alle erfassten Städte"],
};
const TOK = ["--q1", "--q2", "--q3", "--q4", "--q5", "--context", "--surface", "--ink", "--surface-2"];

export function Finder() {
  const { lang, t, f } = useI18n();
  const { eur, num } = f;
  const li = lang === "de" ? 1 : 0;
  const [budget, setBudget] = useState(800);
  const [sqm, setSqm] = useState(55);
  const [seg, setSeg] = useState<string>("auto");
  const [land, setLand] = useState("");
  const [urban, setUrban] = useState<"all" | "city" | "rural">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  const [src, setSrc] = useState<{ rooms: KreisAskingRent[]; sizes: SizeRow[]; aff: KreisAffordability[]; range: Range[]; plz: Postcode[] } | null>(null);
  const [plzQuery, setPlzQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const paths = useKreisPaths();
  const tk = useTokens(TOK);

  useEffect(() => {
    Promise.all([
      loadJson<KreisAskingRent[]>("kreise-asking-rents.json"),
      loadJson<SizeRow[]>("kreise-rents-by-size.json"),
      loadJson<KreisAffordability[]>("kreise-affordability.json"),
      loadJson<Range[]>("kreise-rent-range.json").catch(() => [] as Range[]),
      loadJson<Postcode[]>("postcodes.json").catch(() => [] as Postcode[]),
    ]).then(([rooms, sizes, aff, range, plz]) => setSrc({ rooms, sizes, aff, range, plz })).catch((e) => setErr(String(e)));
  }, []);

  const segment = SEGMENTS.find((s) => s.value === (seg === "auto" ? sizeToSeg(sqm) : seg))!;
  const lands = useMemo(() => [...new Set(src?.aff.map((a) => a.land_name).filter(Boolean) as string[])].sort(), [src]);

  // Same rule as the API's /affordability/finder: estimated asking rent × size ≤ budget.
  const { all, hits, pool } = useMemo(() => {
    if (!src) return { all: new Map<string, Hit>(), hits: [] as Hit[], pool: [] as Hit[] };
    const affBy = Object.fromEntries(src.aff.map((a) => [a.ags, a]));
    const rangeBy = Object.fromEntries(src.range.map((r) => [r.ags, r]));
    const rows = segment.band ? src.sizes.filter((r) => r.size_band_code === segment.band) : src.rooms.filter((r) => r.rooms === segment.rooms);
    const all = new Map<string, Hit>();
    for (const r of rows) {
      const a = affBy[r.ags], est = r.estimated_asking_rent_eur_sqm;
      if (!a || est == null) continue;
      const rg = rangeBy[r.ags];
      all.set(r.ags, { ags: r.ags, name: r.kreis_name, land: a.land_name, urban: a.is_urban_district, est, rent: est * sqm,
        headroom: budget - est * sqm, pop: a.population, method: r.estimate_method ?? "",
        lo: rg ? (est * sqm * rg.p10_index) / 100 : null, hi: rg ? (est * sqm * rg.p90_index) / 100 : null });
    }
    // the districts inside the chosen state / area type; hits are the ones whose average fits the budget
    const pool = [...all.values()].filter((h) => (!land || h.land === land) && (urban === "all" || (urban === "city") === h.urban));
    const hits = pool.filter((h) => h.headroom >= 0).sort((x, y) => (y.pop ?? 0) - (x.pop ?? 0));
    return { all, hits, pool };
  }, [src, segment, sqm, budget, land, urban]);
  const hitSet = useMemo(() => new Set(hits.map((h) => h.ags)), [hits]);
  const color = useMemo(() => {
    if (!tk["--q1"]) return () => "transparent";
    const s = scaleLinear<string>().domain([0, 100, 250, 450, 700]).range(["--q1", "--q2", "--q3", "--q4", "--q5"].map((k) => tk[k])).clamp(true);
    return (ags: string) => (hitSet.has(ags) ? s(all.get(ags)!.headroom) : tk["--context"]);
  }, [tk, hitSet, all]);

  const selHit = sel ? all.get(sel) : null;
  const hv = hover ? all.get(hover.ags) : null;
  const totalPop = hits.reduce((s, h) => s + (h.pop ?? 0), 0);
  // only when nothing fits: the cheapest option inside the current selection
  const cheapest = hits.length === 0 ? [...pool].sort((a, b) => a.rent - b.rent)[0] : undefined;
  const postcodes = useMemo(() => {
    if (!src || !selHit) return [];
    return src.plz.filter((p) => p.ags === selHit.ags)
      .map((p) => ({ ...p, rent: (selHit.rent * p.rent_index_vs_kreis) / 100 }))
      .sort((a, b) => b.rent - a.rent);
  }, [src, selHit]);
  useEffect(() => setPlzQuery(""), [sel]);
  const plzShown = postcodes.filter((p) => !plzQuery || p.plz.startsWith(plzQuery.trim()));
  const plzFit = postcodes.filter((p) => p.rent <= budget).length;

  return (
    <div>
      <div className="rentcheck" style={{ marginBottom: 22 }}>
        <div className="rc-grid">
          <div className="field">
            <label htmlFor="f-budget">{t("Maximum cold rent", "Maximale Kaltmiete")}: <output>{num(budget)} € / {t("month", "Monat")}</output></label>
            <input id="f-budget" type="range" min={250} max={2500} step={25} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="f-sqm">{t("Flat size", "Wohnungsgröße")}: <output>{sqm} m²</output></label>
            <input id="f-sqm" type="range" min={20} max={130} step={5} value={sqm} onChange={(e) => setSqm(Number(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="f-seg">{t("Price flats like", "Preise berechnen für")}</label>
            <select id="f-seg" value={seg} onChange={(e) => setSeg(e.target.value)}>
              <option value="auto">{t("Flats of this size (automatic)", "Diese Größe (automatisch)")}</option>
              {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label[li]}</option>)}
            </select>
          </div>
        </div>
        <div className="controls">
          <div className="field">
            <label htmlFor="f-land">{t("Federal state", "Bundesland")}</label>
            <select id="f-land" value={land} onChange={(e) => setLand(e.target.value)}>
              <option value="">{t("All of Germany", "Ganz Deutschland")}</option>
              {lands.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="flabel">{t("Area type", "Gebietstyp")}</span>
            <div className="seg" role="group" aria-label={t("Area type", "Gebietstyp")}>
              {([["all", t("Everywhere", "Überall")], ["city", t("Cities only", "Nur Städte")], ["rural", t("Rural districts", "Landkreise")]] as const).map(([k, l]) => (
                <button key={k} aria-pressed={urban === k} onClick={() => setUrban(k)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        {src && (
          <p className="rc-say" style={{ margin: 0 }} aria-live="polite">
            {t(<><b style={{ fontFamily: "var(--sans)" }}>{hits.length} of {pool.length === all.size ? "Germany's 400" : `the ${pool.length} matching`} districts</b>{" "}
            {hits.length === 1 ? "fits" : "fit"} {eur(budget, 0)} for {sqm} m² on average{hits.length > 0 && <>, home to about {num(totalPop / 1e6, 1)} million people</>}.
            {cheapest && <> The cheapest in your selection, {cheapest.name.split(",")[0]}, would need about {eur(Math.ceil(cheapest.rent / 10) * 10, 0)}.</>}
            {" "}Prices also vary within each district; click one to see the range.</>,
            <><b style={{ fontFamily: "var(--sans)" }}>{hits.length} von {pool.length === all.size ? "400 Kreisen in Deutschland" : `${pool.length} passenden Kreisen`}</b>{" "}
            {hits.length === 1 ? "passt" : "passen"} im Schnitt zu {eur(budget, 0)} für {sqm} m²{hits.length > 0 && <>, mit zusammen etwa {num(totalPop / 1e6, 1)} Millionen Einwohnern</>}.
            {cheapest && <> Der günstigste in Ihrer Auswahl, {cheapest.name.split(",")[0]}, bräuchte etwa {eur(Math.ceil(cheapest.rent / 10) * 10, 0)}.</>}
            {" "}Die Preise schwanken auch innerhalb jedes Kreises; klicken Sie einen an, um die Spanne zu sehen.</>)}
          </p>
        )}
      </div>
      {err && <p className="note">{t("Could not load data", "Daten konnten nicht geladen werden")}: {err}</p>}

      <div className="split">
        <div>
          <p className="figure-title">{t("Districts that fit your budget", "Kreise, die zu Ihrem Budget passen")}</p>
          <p className="figure-sub">{t("Darker blue leaves more money to spare. Grey is over budget. Click a district for details.", "Dunkleres Blau lässt mehr Geld übrig. Grau liegt über dem Budget. Für Details einen Kreis anklicken.")}</p>
          <div className="legend" style={{ margin: "8px 0" }}>
            <span>{t("Just fits", "Passt knapp")}</span>
            <span className="bar" style={{ background: `linear-gradient(90deg, ${["--q1", "--q2", "--q3", "--q4", "--q5"].map((k) => tk[k]).join(",")})` }} />
            <span>{t("700 €+ to spare", "700 €+ übrig")}</span>
            <span className="key"><span className="sw" style={{ background: tk["--context"] }} />{t("Over budget", "Über Budget")}</span>
          </div>
          <div className="mapwrap" onMouseLeave={() => setHover(null)}>
            {paths ? (
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", maxHeight: 680, display: "block" }} role="img" aria-label={t("Map of German districts that fit the budget", "Karte der deutschen Kreise, die zum Budget passen")}>
                {paths.map((p) => (
                  <path key={p.ags + p.d.length} className="k" d={p.d} fill={color(p.ags)} stroke={tk["--surface"]} strokeWidth={0.5}
                    onClick={() => setSel(p.ags)}
                    onMouseMove={(e) => {
                      const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setHover({ ags: p.ags, x: e.clientX - r.left, y: e.clientY - r.top });
                    }} />
                ))}
                {sel && paths.filter((p) => p.ags === sel).map((p) => <path key="sel" d={p.d} fill="none" stroke={tk["--ink"]} strokeWidth={2} pointerEvents="none" />)}
              </svg>
            ) : <p className="note">{t("Loading map…", "Karte wird geladen…")}</p>}
            {hover && hv && (
              <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 14, 260), top: hover.y + 14, pointerEvents: "none" }}>
                <b>{hv.name}</b><br />{t(`About ${eur(r10(hv.rent), 0)} for ${sqm} m² on average`, `Im Schnitt etwa ${eur(r10(hv.rent), 0)} für ${sqm} m²`)}
                {hv.lo != null && hv.hi != null && <><br /><span className="tt-k">{t(`${eur(r10(hv.lo), 0)} to ${eur(r10(hv.hi), 0)} depending on the area`, `${eur(r10(hv.lo), 0)} bis ${eur(r10(hv.hi), 0)}, je nach Gegend`)}</span></>}<br />
                <span className="tt-k">{hv.headroom >= 0 ? `${eur(Math.round(hv.headroom / 10) * 10, 0)} ${t("under budget", "unter Budget")}` : `${eur(Math.round(-hv.headroom / 10) * 10, 0)} ${t("over budget", "über Budget")}`}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          {selHit ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="meta">{selHit.land} · {selHit.urban ? t("City district", "Kreisfreie Stadt") : t("Rural district", "Landkreis")}</div>
              <h3 style={{ fontSize: 24, margin: "4px 0 8px" }}>{selHit.name}</h3>
              <p className="prose" style={{ fontSize: 17, margin: 0 }}>
                {t(<>On average across the district, a {sqm} m² flat ({segment.label[0].toLowerCase()}) is estimated at <b>{eur(selHit.est)}</b> per m²,
                about <b>{eur(r10(selHit.rent), 0)}</b> a month cold. That is{" "}
                {selHit.headroom >= 0 ? <>{eur(r10(selHit.headroom), 0)} <b>under</b></> : <>{eur(r10(-selHit.headroom), 0)} <b>over</b></>} your budget.</>,
                <>Im Schnitt des Kreises wird eine {sqm}-m²-Wohnung ({segment.label[1]}) auf <b>{eur(selHit.est)}</b> pro m² geschätzt,
                also etwa <b>{eur(r10(selHit.rent), 0)}</b> im Monat kalt. Das sind{" "}
                {selHit.headroom >= 0 ? <>{eur(r10(selHit.headroom), 0)} <b>unter</b></> : <>{eur(r10(-selHit.headroom), 0)} <b>über</b></>} Ihrem Budget.</>)}
              </p>
              {selHit.lo != null && selHit.hi != null && (
                <div className="range-bar" aria-label={t(`Range from ${eur(r10(selHit.lo), 0)} to ${eur(r10(selHit.hi), 0)}`, `Spanne von ${eur(r10(selHit.lo), 0)} bis ${eur(r10(selHit.hi), 0)}`)}>
                  <div className="range-head"><span>{t("Cheaper areas", "Günstigere Gegenden")}</span><span>{t("Dearer areas", "Teurere Gegenden")}</span></div>
                  <div className="range-track">
                    <span className="range-budget" style={{ left: `${Math.max(0, Math.min(100, (100 * (budget - selHit.lo)) / (selHit.hi - selHit.lo)))}%` }} title={t("Your budget", "Ihr Budget")} />
                  </div>
                  <div className="range-head"><b>{eur(r10(selHit.lo), 0)}</b><span className="muted">{t("average", "Schnitt")} {eur(r10(selHit.rent), 0)}</span><b>{eur(r10(selHit.hi), 0)}</b></div>
                  <p className="note" style={{ margin: "6px 0 0" }}>
                    {budget >= selHit.hi ? t("Your budget covers even the dearer areas.", "Ihr Budget reicht sogar für die teureren Gegenden.") : budget >= selHit.lo
                      ? t("Your budget works in the cheaper part of the district, not everywhere.", "Ihr Budget reicht im günstigeren Teil des Kreises, nicht überall.")
                      : t("Even the cheaper areas are above your budget.", "Selbst die günstigeren Gegenden liegen über Ihrem Budget.")}
                    {" "}{t(`The range covers 80% of the district's ${src?.range.find((r) => r.ags === selHit.ags)?.resolution_m === 100 ? "100 m" : "1 km"} census squares (cheapest and dearest 10% left out).`,
                      `Die Spanne umfasst 80 % der ${src?.range.find((r) => r.ags === selHit.ags)?.resolution_m === 100 ? "100-m" : "1-km"}-Zensusquadrate des Kreises (ohne die günstigsten und teuersten 10 %).`)}
                  </p>
                </div>
              )}
              {postcodes.length > 0 && (
                <div className="plz-box">
                  <div className="plz-head">
                    <p className="figure-title" style={{ margin: 0 }}>{t("By postcode", "Nach Postleitzahl")}</p>
                    <span className="muted" style={{ fontSize: 13 }}>{t(`${plzFit} of ${postcodes.length} fit your budget`, `${plzFit} von ${postcodes.length} passen zu Ihrem Budget`)}</span>
                  </div>
                  <div className="field" style={{ margin: "8px 0" }}>
                    <input type="search" inputMode="numeric" maxLength={5} placeholder={t("Your postcode, e.g. 33602", "Ihre PLZ, z. B. 33602")} aria-label={t("Filter by postcode", "Nach Postleitzahl filtern")}
                      value={plzQuery} onChange={(e) => setPlzQuery(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="tablewrap" style={{ maxHeight: 260, overflowY: "auto" }}>
                    <table>
                      <thead><tr><th>{t("Postcode", "PLZ")}</th><th className="num">{t("Est. rent", "Gesch. Miete")}</th><th className="num">{t("vs. budget", "ggü. Budget")}</th></tr></thead>
                      <tbody>
                        {plzShown.map((p) => (
                          <tr key={p.plz}>
                            <td>{p.plz}</td>
                            <td className="num">{eur(r10(p.rent), 0)}</td>
                            <td className="num" style={{ color: p.rent <= budget ? "var(--good)" : "var(--bad)" }}>
                              {p.rent <= budget ? `${eur(r10(budget - p.rent), 0)} ${t("under", "darunter")}` : `${eur(r10(p.rent - budget), 0)} ${t("over", "darüber")}`}
                            </td>
                          </tr>
                        ))}
                        {plzShown.length === 0 && <tr><td colSpan={3} className="cellwrap muted">{t(`No postcode in this district starts with ${plzQuery}.`, `Keine Postleitzahl in diesem Kreis beginnt mit ${plzQuery}.`)}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <p className="note" style={{ margin: "6px 0 0" }}>
                    {t("Each postcode's estimate scales the district average by how its 2022 census rents compare with the rest of the district. Postcode areas © OpenStreetMap contributors (ODbL).",
                      "Die Schätzung je Postleitzahl skaliert den Kreisdurchschnitt danach, wie ihre Zensusmieten 2022 im Vergleich zum restlichen Kreis liegen. PLZ-Gebiete © OpenStreetMap-Mitwirkende (ODbL).")}
                  </p>
                </div>
              )}
              <p className="note" style={{ marginTop: 8 }}>{t("Estimate: census rent for this flat type, raised to today's level", "Schätzung: Zensusmiete für diesen Wohnungstyp, auf das heutige Niveau angehoben")} ({METHOD[selHit.method]?.[li] ?? t("model estimate", "Modellschätzung")}). {t("Real listings vary.", "Echte Inserate weichen ab.")}</p>
              <button className="chip" style={{ marginTop: 10 }} onClick={() => setSel(null)}>{t("Clear selection", "Auswahl aufheben")}</button>
            </div>
          ) : (
            <p className="note" style={{ marginBottom: 12 }}>{t("Tip: click any district on the map to see its estimate in words.", "Tipp: Klicken Sie einen Kreis auf der Karte an, um seine Schätzung in Worten zu sehen.")}</p>
          )}
          <p className="figure-title">{t("Matches, largest population first", "Treffer, größte Bevölkerung zuerst")}</p>
          <div className="tablewrap" style={{ maxHeight: 560, overflowY: "auto", marginTop: 8 }}>
            <table>
              <thead><tr><th>{t("District", "Kreis")}</th><th className="num">{t("Est. rent (average)", "Gesch. Miete (Schnitt)")}</th><th className="num">{t("To spare", "Übrig")}</th></tr></thead>
              <tbody>
                {hits.slice(0, 150).map((h) => (
                  <tr key={h.ags} onClick={() => setSel(h.ags)} style={{ cursor: "pointer", background: sel === h.ags ? "var(--surface-2)" : undefined }}>
                    <td className="cellwrap"><b style={{ fontWeight: 600 }}>{h.name.split(",")[0]}</b><br /><span className="muted" style={{ fontSize: 12 }}>{h.land}</span></td>
                    <td className="num">{eur(r10(h.rent), 0)}{h.lo != null && h.hi != null && <><br /><span className="muted" style={{ fontSize: 12 }}>{eur(r10(h.lo), 0)} {t("to", "bis")} {eur(r10(h.hi), 0)}</span></>}</td>
                    <td className="num">{eur(Math.round(h.headroom / 10) * 10, 0)}</td>
                  </tr>
                ))}
                {src && hits.length === 0 && <tr><td colSpan={3} className="cellwrap muted">{t("Nothing fits yet. Try a smaller flat, a higher budget or another state.", "Noch passt nichts. Versuchen Sie eine kleinere Wohnung, ein höheres Budget oder ein anderes Bundesland.")}</td></tr>}
              </tbody>
            </table>
          </div>
          {hits.length > 150 && <p className="note" style={{ marginTop: 6 }}>{t(`Showing the 150 largest of ${hits.length} matches.`, `Angezeigt werden die 150 größten von ${hits.length} Treffern.`)}</p>}
        </div>
      </div>
    </div>
  );
}
