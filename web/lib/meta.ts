import type { Metadata } from "next";
import { href, type Lang } from "./i18n";

/** Page metadata in one language, with hreflang links to the same page in the other language. */
export function pageMeta(lang: Lang, path: string, title: string | { absolute: string }, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: href(lang, path), languages: { en: href("en", path), de: href("de", path), "x-default": href("en", path) } },
    openGraph: {
      title: typeof title === "string" ? `${title} · ImmoDash` : title.absolute, description, type: "website",
      locale: lang === "de" ? "de_DE" : "en_GB", siteName: "ImmoDash", url: href(lang, path),
      images: [{ url: "/og.png", width: 1200, height: 630, alt: lang === "de"
        ? "ImmoDash: Karte der 400 Kreise Deutschlands, eingefärbt nach Angebotsmiete"
        : "ImmoDash: map of Germany's 400 districts coloured by asking rent" }],
    },
  };
}
