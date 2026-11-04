import { Finder } from "@/components/Finder";
import { RankBars } from "@/components/RankBars";
import { Term } from "@/components/Term";
import { Figure, Head, PageHero, Stat, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { fmt, median } from "@/lib/format";
import { tx, type Lang } from "@/lib/i18n";

const WORDS = {
  en: ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "All twelve"],
  de: ["Keiner", "Einer", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn", "Elf", "Alle zwölf"],
};

export function AffordabilityView({ lang }: { lang: Lang }) {
  const { eur, pct } = fmt(lang), t = tx(lang);
  const words = (n: number) => WORDS[lang][n] ?? String(n);
  const short = (n: string) => n.split(",")[0];
  const aff = data.affordability();
  const worst = [...aff].sort((a, b) => b.rent_burden_pct - a.rent_burden_pct).slice(0, 12);
  const best = [...aff].sort((a, b) => a.rent_burden_pct - b.rent_burden_pct).slice(0, 12);
  const med = median(aff.map((a) => a.rent_burden_pct));
  const bar = (rows: typeof aff) => rows.map((k) => ({ label: short(k.kreis_name), sub: k.land_name ?? "", v: k.rent_burden_pct,
    note: t(`${eur(k.rent_eur_sqm)}/m² rent, ${eur(k.disposable_income_per_resident_eur, 0)} income per resident`,
      `${eur(k.rent_eur_sqm)}/m² Miete, ${eur(k.disposable_income_per_resident_eur, 0)} Einkommen je Einwohner`) }));
  const urbanWorst = worst.filter((w) => w.is_urban_district).length;
  const ruralBest = best.every((b) => !b.is_urban_district) ? 12 : best.filter((b) => !b.is_urban_district).length;
  const src = t("Zensus 2022; VGR der Länder.", "Zensus 2022; VGR der Länder.");
  return (
    <>
      <PageHero de={lang === "de"} title={t("Where can I afford to live?", "Wo kann ich mir das Wohnen leisten?")}
        lead={t(<>Set a budget and a flat size. The map shows every <Term k="kreis">district</Term> where a flat like that is
          likely to be advertised within it today.</>,
          <>Budget und Wohnungsgröße einstellen. Die Karte zeigt jeden <Term k="kreis">Kreis</Term>, in dem eine solche Wohnung heute
          voraussichtlich in diesem Rahmen inseriert wird.</>)}
        facts={<>
          <Stat label={t("Typical district", "Typischer Kreis")} value={pct(med, 1)}
            say={t(<>Share of two residents&apos; net income that rent for 60 m² takes, at 2022 census rents.</>,
              <>Anteil am Nettoeinkommen zweier Einwohner, den die Miete für 60 m² zu Zensusmieten von 2022 ausmacht.</>)} />
          <Stat label={`${t("Least affordable", "Am wenigsten bezahlbar")}: ${short(worst[0].kreis_name)}`} value={pct(worst[0].rent_burden_pct, 1)}
            say={t("Rent takes the largest share of local income here.", "Hier nimmt die Miete den größten Teil des örtlichen Einkommens.")} />
          <Stat label={`${t("Most affordable", "Am bezahlbarsten")}: ${short(best[0].kreis_name)}`} value={pct(best[0].rent_burden_pct, 1)}
            say={t("Rent takes the smallest share of local income here.", "Hier nimmt die Miete den kleinsten Teil des örtlichen Einkommens.")} />
          <Stat label={t("Typical income", "Typisches Einkommen")} value={eur(median(aff.map((a) => a.disposable_income_per_resident_eur)), 0)} unit={t("a year", "im Jahr")}
            say={t("Net income per resident across the 400 districts.", "Nettoeinkommen je Einwohner über die 400 Kreise.")} />
        </>} />
      <section className="section tight" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Finder />
          <details className="howto" style={{ marginTop: 18 }}>
            <summary>{t("Where these estimates come from", "Woher diese Schätzungen stammen")}</summary>
            <div className="body">
              {t(<>
                <p>The 2022 census recorded rents for every district by flat size and number of rooms. Those are existing leases, which are
                  cheaper than new ones. For the 37 cities with listing data we can measure how much more new leases cost; for every other district we
                  apply the typical gap in its federal state. The result is an estimate of today&apos;s <Term k="asking-rent" /> for that kind
                  of flat, not a list of real offers.</p>
                <p>Use it to narrow down where to look, then check real listings. Heating and running costs come on top of the <Term k="cold-rent" />.</p>
              </>, <>
                <p>Der Zensus 2022 hat die Mieten für jeden Kreis nach Wohnungsgröße und Zimmerzahl erfasst. Das sind Bestandsverträge, die
                  günstiger sind als neue. Für die 37 Städte mit Inseratsdaten lässt sich messen, wie viel mehr Neuverträge kosten; für alle anderen Kreise
                  verwenden wir die typische Lücke in ihrem Bundesland. Das Ergebnis ist eine Schätzung der heutigen <Term k="asking-rent" /> für diese Art
                  Wohnung, keine Liste echter Angebote.</p>
                <p>Nutzen Sie es, um die Suche einzugrenzen, und prüfen Sie dann echte Inserate. Heizung und Nebenkosten kommen zur <Term k="cold-rent" /> hinzu.</p>
              </>)}
            </div>
          </details>
        </div>
      </section>

      <section className="section band" style={{ paddingBottom: 72, marginTop: 64 }}>
        <div className="wrap">
          <Head title={t("Where rent takes the biggest bite out of local pay", "Wo die Miete den größten Teil des Einkommens frisst")}>
            {t(<>A cheap rent is not affordable if wages are low. The <Term k="rent-burden" /> combines both: census rent for 60 m² as a share of
              two average residents&apos; net income. Across all 400 districts the middle value is <b style={{ color: "var(--ink)" }}>{pct(med, 1)}</b>.</>,
              <>Eine günstige Miete ist nicht bezahlbar, wenn die Löhne niedrig sind. Die <Term k="rent-burden" /> verbindet beides: Zensusmiete für 60 m² als Anteil
              am Nettoeinkommen zweier durchschnittlicher Einwohner. Über alle 400 Kreise liegt der mittlere Wert bei <b style={{ color: "var(--ink)" }}>{pct(med, 1)}</b>.</>)}
          </Head>
          <div className="split even">
            <Figure title={t("Highest rent burden", "Höchste Mietbelastung")}
              sub={t("Rent for 60 m² as a share of two residents' net income, 2022.", "Miete für 60 m² als Anteil am Nettoeinkommen zweier Einwohner, 2022.")} source={src}>
              <RankBars rows={bar(worst)} max={Math.max(...worst.map((w) => w.rent_burden_pct))} tone="bad" fmt="pct" lang={lang} />
            </Figure>
            <Figure title={t("Lowest rent burden", "Niedrigste Mietbelastung")}
              sub={t("Same measure, the twelve most affordable districts.", "Dasselbe Maß, die zwölf bezahlbarsten Kreise.")} source={src}>
              <RankBars rows={bar(best)} max={Math.max(...worst.map((w) => w.rent_burden_pct))} tone="good" fmt="pct" lang={lang} />
            </Figure>
          </div>
          <div style={{ maxWidth: 760 }}>
            <Takeaway>
              {t(<>{words(urbanWorst)} of the twelve least affordable districts are cities, led by{" "}
                {worst.slice(0, 3).map((w) => short(w.kreis_name)).join(", ")}: rents there are high and incomes, though above average,
                do not keep up. {words(ruralBest)} of the most affordable are rural districts, where the same flat takes about{" "}
                {pct((100 * best[0].rent_burden_pct) / worst[0].rent_burden_pct, 0)} of what it takes in {short(worst[0].kreis_name)}.</>,
              <>{words(urbanWorst)} der zwölf am wenigsten bezahlbaren Kreise sind Städte, angeführt von{" "}
                {worst.slice(0, 3).map((w) => short(w.kreis_name)).join(", ")}: Die Mieten sind dort hoch, und die Einkommen halten trotz
                überdurchschnittlicher Höhe nicht mit. {words(ruralBest)} der bezahlbarsten sind Landkreise, wo dieselbe Wohnung etwa{" "}
                {pct((100 * best[0].rent_burden_pct) / worst[0].rent_burden_pct, 0)} dessen kostet, was sie in {short(worst[0].kreis_name)} vom Einkommen nimmt.</>)}
            </Takeaway>
          </div>
        </div>
      </section>
    </>
  );
}
