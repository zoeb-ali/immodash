"use client";

import { usePathname } from "next/navigation";
import { fmt } from "./format";
import { href, langOf, tx, type Lang } from "./i18n";

/** Language of the current page, read from the URL (works during static export and in the browser alike). */
export function useLang(): Lang {
  return langOf(usePathname() ?? "/");
}

/** Everything a client component needs to speak the page's language. */
export function useI18n() {
  const lang = useLang();
  return { lang, t: tx(lang), f: fmt(lang), to: (p: string) => href(lang, p) };
}
