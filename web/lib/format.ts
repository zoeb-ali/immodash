import { LOCALE, type Lang } from "./i18n";

/** Number and date formatting for one language. German uses decimal commas and a space before % and €. */
export function fmt(lang: Lang = "en") {
  const loc = LOCALE[lang];
  const NA = lang === "de" ? "k. A." : "n/a";
  const num = (v: number | null | undefined, d = 0) =>
    v == null ? NA : v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d });
  const eur = (v: number | null | undefined, d = 2) => (v == null ? NA : `${num(v, d)}\u00a0€`);
  const pct = (v: number | null | undefined, d = 1, sign = false) =>
    v == null ? NA : `${sign && v > 0 ? "+" : ""}${num(v, d)}${lang === "de" ? "\u00a0%" : "%"}`;
  const month = (iso: string) => new Date(iso).toLocaleDateString(loc, { month: "short", year: "numeric", timeZone: "UTC" });
  const monthLong = (iso: string) => new Date(iso).toLocaleDateString(loc, { month: "long", year: "numeric", timeZone: "UTC" });
  const day = (iso: string, m: "long" | "short" = "long") =>
    new Date(iso).toLocaleDateString(loc, { day: "numeric", month: m, year: "numeric", timeZone: "UTC" });
  const sqm = (v: number | null | undefined, d = 2) => (v == null ? NA : `${num(v, d)} €/m²`);
  /** "1 in 3" / "1 von 3" for shares, so readers don't have to parse decimals. */
  const inN = (share: number): string => {
    for (const [a, b] of [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [1, 8], [1, 10]]) {
      if (Math.abs(share - a / b) < 0.025) return lang === "de" ? `${a} von ${b}` : `${a} in ${b}`;
    }
    return pct(share * 100, 0);
  };
  const ordinal = (n: number) => {
    if (lang === "de") return `${n}.`;
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return { num, eur, pct, month, monthLong, day, sqm, inN, ordinal, NA };
}

const en = fmt("en");
export const { eur, num, pct, month, monthLong, sqm, inN, ordinal } = en;

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
