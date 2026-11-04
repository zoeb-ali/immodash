import { KreisMap } from "@/components/KreisMap";
import { Term } from "@/components/Term";
import { data } from "@/lib/data";
import { fmt, median } from "@/lib/format";
import { tx, type Lang } from "@/lib/i18n";
import { PageHero, Stat } from "@/components/ui";

const short = (n: string) => n.split(",")[0];

export function MapView({ lang }: { lang: Lang }) {
  const { eur, num } = fmt(lang), t = tx(lang);
  const citySlugs = Object.fromEntries(data.cities().map((c) => [c.ags, c.slug]));
  const rents = data.askingRents().filter((r) => r.rooms === "total");
  const sorted = [...rents].sort((a, b) => b.estimated_asking_rent_eur_sqm - a.estimated_asking_rent_eur_sqm);
  const measured = data.cities().length;
  const dear = sorted[0], cheap = sorted[sorted.length - 1];
  const perSqm = t("per m²", "pro m²");
  const month60 = (v: number) => t(<>About {num(Math.round(v * 6) * 10)} € a month for 60 m².</>, <>Etwa {num(Math.round(v * 6) * 10)} € im Monat für 60 m².</>);
  return (
    <>
      <PageHero de={lang === "de"} title={t("Germany, district by district", "Deutschland, Kreis für Kreis")}
        lead={t(<>What a new lease costs, how that compares with local incomes, and how tight the market is, for all 400{" "}
          <Term k="kreis">districts</Term>. Click any of them to read about it in plain words.</>,
          <>Was ein neuer Mietvertrag kostet, wie das zum örtlichen Einkommen passt und wie eng der Markt ist, für alle 400{" "}
          <Term k="kreis">Kreise</Term>. Klicken Sie auf einen, um ihn in einfachen Worten erklärt zu bekommen.</>)}
        facts={<>
          <Stat label={t("Typical district", "Typischer Kreis")} value={eur(median(rents.map((r) => r.estimated_asking_rent_eur_sqm)))} unit={perSqm}
            say={t("Estimated asking rent for a new lease today.", "Geschätzte Angebotsmiete für einen Neuvertrag heute.")} />
          <Stat label={`${t("Dearest", "Am teuersten")}: ${short(dear.kreis_name)}`} value={eur(dear.estimated_asking_rent_eur_sqm)} unit={perSqm} say={month60(dear.estimated_asking_rent_eur_sqm)} />
          <Stat label={`${t("Cheapest", "Am günstigsten")}: ${short(cheap.kreis_name)}`} value={eur(cheap.estimated_asking_rent_eur_sqm)} unit={perSqm} say={month60(cheap.estimated_asking_rent_eur_sqm)} />
          <Stat label={t("Measured directly", "Direkt gemessen")} value={measured} unit={t(`of ${rents.length}`, `von ${rents.length}`)}
            say={t("Districts with listing data; the rest are estimated from census rents.", "Kreise mit Inseratsdaten; die übrigen sind aus Zensusmieten geschätzt.")} />
        </>} />
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <KreisMap afford={data.affordability()} sd={data.supplyDemand()} citySlugs={citySlugs} asking={rents} />
        </div>
      </section>
    </>
  );
}
