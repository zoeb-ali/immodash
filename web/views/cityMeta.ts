import type { Metadata } from "next";
import { data } from "@/lib/data";
import { fmt } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import { pageMeta } from "@/lib/meta";

export const cityParams = () => data.cities().map((c) => ({ city: c.slug }));

export function cityMeta(lang: Lang, slug: string): Metadata {
  const c = data.cities().find((x) => x.slug === slug);
  if (!c) return { title: lang === "de" ? "Stadt" : "City" };
  const rent = fmt(lang).num(c.median_rent_sqm, 2);
  return lang === "de"
    ? pageMeta("de", `/cities/${slug}`, `Mieten in ${c.city}`, `Was Wohnen zur Miete in ${c.city} kostet: ${rent} €/m² Angebotsmiete, Bezahlbarkeit, Mietkarte der Viertel und ein Ausblick auf 12 Monate.`)
    : pageMeta("en", `/cities/${slug}`, `Rents in ${c.city_en}`, `What renting in ${c.city_en} costs: ${rent} €/m² asking rent, affordability, neighbourhood map and a 12-month outlook.`);
}
