"use client";

import { useRouter } from "next/navigation";
import { cityName } from "@/lib/i18n";
import { useI18n } from "@/lib/useLang";

export function CitySwitcher({ cities, current }: { cities: { slug: string; city: string; city_en: string }[]; current: string }) {
  const router = useRouter();
  const { lang, t, to } = useI18n();
  const nm = (c: { city: string; city_en: string }) => cityName(lang, c);
  return (
    <select className="switcher" aria-label={t("Switch city", "Stadt wechseln")} value={current} onChange={(e) => router.push(to(`/cities/${e.target.value}`))}
      style={{ minHeight: 34, padding: "4px 10px", borderRadius: 999, fontSize: 13 }}>
      {[...cities].sort((a, b) => nm(a).localeCompare(nm(b), lang)).map((c) => <option key={c.slug} value={c.slug}>{nm(c)}</option>)}
    </select>
  );
}
