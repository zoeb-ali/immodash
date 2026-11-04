import { CityCards, type CardCity } from "@/components/CityCards";
import { Term } from "@/components/Term";
import { data } from "@/lib/data";
import { fmt, median } from "@/lib/format";
import { cityName, tx, type Lang } from "@/lib/i18n";
import { PageHero, Stat } from "@/components/ui";

export function CitiesView({ lang }: { lang: Lang }) {
  const { eur, pct, monthLong } = fmt(lang), t = tx(lang);
  const cities = data.cities();
  const monthly = data.monthly();
  const meta = data.meta();
  const byRent = [...cities].sort((a, b) => b.median_rent_sqm - a.median_rent_sqm);
  const dear = byRent[0], cheap = byRent[byRent.length - 1];
  const fast = [...cities].sort((a, b) => (b.index_yoy_pct ?? -99) - (a.index_yoy_pct ?? -99))[0];
  const cards: CardCity[] = cities.map((c) => ({
    slug: c.slug, city: c.city, city_en: c.city_en, land: c.land_name, median: c.median_rent_sqm, yoy: c.index_yoy_pct,
    burden: c.asking_rent_burden_pct,
    spark: monthly.filter((r) => r.city === c.city && r.median_rent_sqm != null).map((r) => r.median_rent_sqm as number),
  }));
  const perSqm = t("per m²", "pro m²");
  const last12 = (v: number | null) => t(<>{pct(v, 1, true)} in the last 12 months.</>, <>{pct(v, 1, true)} in den letzten 12 Monaten.</>);
  return (
    <>
      <PageHero de={lang === "de"} title={t("37 cities, one page each", "37 Städte, je eine Seite")}
        lead={t(<>An AI-written summary, a street-level rent map and a 12-month outlook for every city. Lines show the median{" "}
          <Term k="asking-rent" /> since 2020, up to {monthLong(meta.latest_month)}.</>,
          <>Eine KI-Zusammenfassung, eine Mietkarte auf Straßenebene und ein 12-Monats-Ausblick für jede Stadt. Die Linien zeigen die mittlere{" "}
          <Term k="asking-rent" /> seit 2020, bis {monthLong(meta.latest_month)}.</>)}
        facts={<>
          <Stat label={t("Typical city", "Typische Stadt")} value={eur(median(cities.map((c) => c.median_rent_sqm)))} unit={perSqm}
            say={t("The middle of the 37 median asking rents.", "Die Mitte der 37 mittleren Angebotsmieten.")} />
          <Stat label={`${t("Most expensive", "Am teuersten")}: ${cityName(lang, dear)}`} value={eur(dear.median_rent_sqm)} unit={perSqm} say={last12(dear.index_yoy_pct)} />
          <Stat label={`${t("Cheapest", "Am günstigsten")}: ${cityName(lang, cheap)}`} value={eur(cheap.median_rent_sqm)} unit={perSqm} say={last12(cheap.index_yoy_pct)} />
          <Stat label={`${t("Fastest rise", "Stärkster Anstieg")}: ${cityName(lang, fast)}`} value={pct(fast.index_yoy_pct, 1, true)}
            say={t("Change in asking rent in the last 12 months.", "Veränderung der Angebotsmiete in den letzten 12 Monaten.")} />
        </>} />
      <section className="section tight">
        <div className="wrap"><CityCards cities={cards} /></div>
      </section>
    </>
  );
}
