// Build-time hero map: project the district outlines once on the server, so the browser receives finished
// SVG paths instead of downloading GeoJSON and running d3 itself. Colours are CSS color-mix() between the
// theme's ramp tokens, so light and dark mode work without any client-side colour code.
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { data } from "./data";

import { HERO_H, HERO_W } from "./heroDims";

export { HERO_H, HERO_W };

export type HeroPath = { ags: string; d: string; fill: string; rank: number };

export function heroMap(rents: Record<string, number>) {
  const geo = data.geoLite();
  const proj = geoMercator().fitSize([HERO_W, HERO_H], geo as unknown as FeatureCollection);
  const gp = geoPath(proj).digits(1);
  const v = Object.values(rents).sort((a, b) => a - b);
  const lo = v[Math.floor(v.length * 0.02)], hi = v[Math.floor(v.length * 0.98)];
  const rank = Object.fromEntries(Object.entries(rents).sort((a, b) => a[1] - b[1]).map(([a], i) => [a, i]));
  const fill = (ags: string) => {
    const r = rents[ags];
    if (r == null) return "var(--surface-2)";
    const t = Math.min(1, Math.max(0, (r - lo) / (hi - lo))) * 4; // four segments between q1..q5
    const i = Math.min(3, Math.floor(t)), f = Math.round((t - i) * 100);
    return f === 0 ? `var(--q${i + 1})` : `color-mix(in srgb, var(--q${i + 2}) ${f}%, var(--q${i + 1}))`;
  };
  const paths: HeroPath[] = geo.features.map((f) => ({
    ags: String(f.id), d: gp(f as unknown as Feature) ?? "", fill: fill(String(f.id)), rank: rank[String(f.id)] ?? 0,
  }));
  return { paths, lo, hi };
}

/** FE-2: the hero map as a standalone SVG file per theme (served from /hero-map-light.svg and /hero-map-dark.svg).
 *  The page shows it as an <img>, so the 400 paths are no longer inlined twice (HTML + React payload) in the home
 *  page; the interactive copy is fetched only when someone points at the map. */
export const HERO_THEMES = {
  light: { q1: "#cde2fb", q2: "#9ec5f4", q3: "#5598e7", q4: "#256abf", q5: "#0d366b", surface2: "#eeeef0", bg: "#f6f6f7" },
  dark: { q1: "#0d366b", q2: "#184f95", q3: "#2a78d6", q4: "#6da7ec", q5: "#cde2fb", surface2: "#1f2024", bg: "#0f1012" },
} as const;

export function heroRents(): { rents: Record<string, number>; names: Record<string, string> } {
  const asking = data.askingRents().filter((r) => r.rooms === "total");
  return {
    rents: Object.fromEntries(asking.map((r) => [r.ags, r.estimated_asking_rent_eur_sqm])),
    names: Object.fromEntries(asking.map((r) => [r.ags, r.kreis_name])),
  };
}

export function heroSvg(theme: keyof typeof HERO_THEMES, standalone = true): string {
  const c = HERO_THEMES[theme];
  const { paths } = heroMap(heroRents().rents);
  const vars = `--q1:${c.q1};--q2:${c.q2};--q3:${c.q3};--q4:${c.q4};--q5:${c.q5};--surface-2:${c.surface2};--bg:${c.bg}`;
  const body = paths.map((p) => `<path class="k" data-ags="${p.ags}" d="${p.d}" style="fill:${p.fill}"/>`).join("");
  const style = standalone ? `<style>svg{${vars}}path{stroke:${c.bg};stroke-width:.6}</style>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HERO_W} ${HERO_H}" class="hero-map">${style}${body}</svg>`;
}
