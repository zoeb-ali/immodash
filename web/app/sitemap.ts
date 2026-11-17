import type { MetadataRoute } from "next";
import { data } from "@/lib/data";
import { href } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** FE-5: every page in both languages, with hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(data.meta().generated_at);
  const paths = ["/", "/cities", "/affordability", "/map", "/supply-demand", "/methodology", "/about",
    ...data.cities().map((c) => `/cities/${c.slug}`)];
  return paths.flatMap((p) => (["en", "de"] as const).map((lang) => ({
    url: SITE_URL + href(lang, p),
    lastModified,
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1 : p.startsWith("/cities/") ? 0.6 : 0.8,
    alternates: { languages: { en: SITE_URL + href("en", p), de: SITE_URL + href("de", p) } },
  })));
}
