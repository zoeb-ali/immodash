// Two languages: English at the root (/cities), German under /de (/de/cities).
// Server components get `lang` as a prop from their route; client components read it from the URL (useLang).
export type Lang = "en" | "de";
export const LANGS: Lang[] = ["en", "de"];
export const LOCALE: Record<Lang, string> = { en: "en-GB", de: "de-DE" };

/** Path in the given language: href("de", "/cities") -> "/de/cities". Hash and query are kept. */
export function href(lang: Lang, path: string): string {
  if (lang === "en" || /^https?:/.test(path)) return path;
  if (path === "/" || path.startsWith("/#")) return `/de${path.slice(1)}`;
  return `/de${path}`;
}

/** The language of a path, and the same page in the other language. */
export const langOf = (path: string): Lang => (path === "/de" || path.startsWith("/de/") ? "de" : "en");
export function basePath(path: string): string {
  if (langOf(path) === "en") return path || "/";
  const rest = path.slice(3);
  return rest === "" ? "/" : rest;
}

/** Pick the text for a language: tx("de")("Cities", "Städte"). */
export const tx = (lang: Lang) => <T,>(en: T, de: T): T => (lang === "de" ? de : en);

/** City display name: German name on German pages (München), English elsewhere (Munich). */
export const cityName = (lang: Lang, c: { city: string; city_en: string }) => (lang === "de" ? c.city : c.city_en);

/** Market balance labels; the data stores the English key. */
export const BALANCE: Record<Lang, Record<string, string>> = {
  en: { tight: "tight", balanced: "balanced", slack: "slack" },
  de: { tight: "angespannt", balanced: "ausgeglichen", slack: "entspannt" },
};
export const balance = (lang: Lang, b: string | null | undefined) => (b ? BALANCE[lang][b] ?? b : "n/a");
