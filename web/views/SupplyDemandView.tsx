import { Cite } from "@/components/Cite";
import Link from "next/link";
import { RankBars } from "@/components/RankBars";
import { SupplyDemandScatter } from "@/components/SupplyDemandCharts";
import { Term } from "@/components/Term";
import { Figure, Head, PageHero, Stat, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { fmt } from "@/lib/format";
import { balance, cityName, href, tx, type Lang } from "@/lib/i18n";

function pearson(a: number[], b: number[]) {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num_ = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num_ += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num_ / Math.sqrt(da * db);
}

export function SupplyDemandView({ lang }: { lang: Lang }) {
  const { num, pct } = fmt(lang), t = tx(lang), de = lang === "de", to = (p: string) => href(lang, p);
  const kreise = data.supplyDemand(), cities = data.citySupplyDemand(), snaps = data.cities();
  const slugOf = Object.fromEntries(snaps.map((s) => [s.city, s.slug]));
  const big = ["Berlin", "München", "Hamburg", "Frankfurt am Main", "Köln", "Leipzig", "Chemnitz"];
  const highlight = Object.fromEntries(snaps.filter((s) => big.includes(s.city)).map((s) => [s.ags, cityName(lang, s)]));
  const ok = cities.filter((c) => c.supply_demand_index != null && c.demand_pressure_score != null);
  const r = pearson(ok.map((c) => c.supply_demand_index!), ok.map((c) => c.demand_pressure_score!));
  const rs = num(r, 2);
  const counts = { tight: 0, balanced: 0, slack: 0 } as Record<string, number>;
  kreise.forEach((k) => counts[k.market_balance]++);
  const popTight = kreise.filter((k) => k.market_balance === "tight").reduce((s, k) => s + (k.population ?? 0), 0);
  const popAll = kreise.reduce((s, k) => s + (k.population ?? 0), 0);
  const sorted = [...kreise].sort((a, b) => b.supply_demand_index - a.supply_demand_index);
  const tightest = sorted.slice(0, 10), slackest = sorted.slice(-10).reverse();
  const strength = Math.abs(r) >= 0.7 ? t("strongly", "stark") : Math.abs(r) >= 0.4 ? t("clearly", "deutlich") : t("only loosely", "nur lose");
  const tightRural = kreise.filter((k) => k.market_balance === "tight" && !k.is_urban_district).length;
  const topLands = (bal: string, n = 2) => {
    const c: Record<string, number> = {};
    kreise.filter((k) => k.market_balance === bal && k.land_name).forEach((k) => (c[k.land_name!] = (c[k.land_name!] ?? 0) + 1));
    return Object.entries(c).sort((x, y) => y[1] - x[1]).slice(0, n).map(([l]) => l);
  };
  const and = t(" and ", " und ");
  const joinAnd = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")}${and}${xs[xs.length - 1]}`;
  const cityRows = [...cities].sort((a, b) => (b.supply_demand_index ?? -9) - (a.supply_demand_index ?? -9));
  const sub = (k: (typeof kreise)[number]) => t(`${pct(k.market_active_vacancy_pct)} empty, ${pct(k.population_growth_5y_pct, 1, true)} pop.`,
    `${pct(k.market_active_vacancy_pct)} leer, ${pct(k.population_growth_5y_pct, 1, true)} Bev.`);
  const src = t("ImmoDash, from Zensus 2022 and population statistics.", "ImmoDash, aus Zensus 2022 und Bevölkerungsstatistik.");
  const districts = t("districts", "Kreise");

  return (
    <>
      <PageHero full de={de} title={t("Where demand outruns the housing stock", "Wo die Nachfrage den Wohnungsbestand übersteigt")}
        lead={t("Where more people want to live than there are flats, rents come under pressure. We measure both sides in every district.",
          "Wo mehr Menschen wohnen wollen, als es Wohnungen gibt, geraten die Mieten unter Druck. Wir messen beide Seiten in jedem Kreis.")}
        facts={<>
          <Stat label={t("Tight markets", "Angespannte Märkte")} value={counts.tight} unit={districts}
            say={t(<>Home to {pct((100 * popTight) / popAll, 0)} of Germany&apos;s population.</>, <>Hier leben {pct((100 * popTight) / popAll, 0)} der Bevölkerung Deutschlands.</>)} />
          <Stat label={t("Balanced", "Ausgeglichen")} value={counts.balanced} unit={districts} say={t("Supply and demand roughly match.", "Angebot und Nachfrage passen ungefähr zusammen.")} />
          <Stat label={t("Slack markets", "Entspannte Märkte")} value={counts.slack} unit={districts}
            say={t("Many empty flats, shrinking or flat population.", "Viele leere Wohnungen, schrumpfende oder stagnierende Bevölkerung.")} />
          <Stat label={t("Check against live listings", "Abgleich mit echten Inseraten")} value={`r = ${rs}`}
            say={t(<>The index {strength} agrees with how fast flats are actually let in 37 cities.</>, <>Der Index stimmt {strength} damit überein, wie schnell Wohnungen in 37 Städten tatsächlich vermietet werden.</>)} />
        </>} />

      <section className="section">
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 36 }}>
            <h2>{t("Empty flats against population growth", "Leere Wohnungen gegen Bevölkerungswachstum")}</h2>
            <div className="prose" style={{ marginTop: 14 }}>
              {t(<p><strong>Supply</strong> is the <Term k="vacancy">share of flats that stood empty and available</Term> in the 2022 census.<Cite id="destatis2024" /> Housing
                research usually puts the vacancy a market needs for normal moving at 2 to 3%.<Cite id="saxony2022" /> <strong>Demand</strong> is population change over the last five
                years. The <Term k="supply-demand" /> combines the two, so a district with few empty flats and a growing population scores high. German rent law uses the same two signals, low vacancy
                and population growth without enough new building, to define a tight housing market.<Cite id="bgb556d" /></p>,
              <p><strong>Angebot</strong> ist der <Term k="vacancy">Anteil der Wohnungen, die leer standen und verfügbar waren</Term>, laut Zensus 2022.<Cite id="destatis2024" /> Die
                Wohnungsforschung setzt den für normale Umzüge nötigen Leerstand meist bei 2 bis 3 % an.<Cite id="saxony2022" /> <strong>Nachfrage</strong> ist die Bevölkerungsveränderung der
                letzten fünf Jahre. Der <Term k="supply-demand" /> verbindet beides: Ein Kreis mit wenig Leerstand und wachsender Bevölkerung erzielt einen hohen Wert. Das deutsche Mietrecht nutzt
                dieselben zwei Signale, geringen Leerstand und Bevölkerungswachstum ohne ausreichenden Neubau, um einen angespannten Wohnungsmarkt zu bestimmen.<Cite id="bgb556d" /></p>)}
            </div>
          </div>
          <Figure title={t("400 districts: empty flats versus population growth", "400 Kreise: leere Wohnungen und Bevölkerungswachstum")}
            sub={t("Each bubble is a district, sized by population. Dashed lines mark the German middle on each axis.",
              "Jede Blase ist ein Kreis, ihre Größe zeigt die Bevölkerung. Gestrichelte Linien markieren den deutschen Mittelwert auf jeder Achse.")}
            source={t("Zensus 2022 (vacancy); Statistische Ämter, population 2018 to 2023.", "Zensus 2022 (Leerstand); Statistische Ämter, Bevölkerung 2018 bis 2023.")}
            howto={t(<>
              <p>Top left: few empty flats and a growing population. That is where competition for flats is fiercest. Bottom right: many empty flats
                and a shrinking population, which keeps rents low. The horizontal axis is stretched at the low end because the difference between 1%
                and 2% empty matters far more than between 8% and 9%.</p>
              <p>Use the search box to find your district on the chart.</p>
            </>, <>
              <p>Oben links: wenige leere Wohnungen und eine wachsende Bevölkerung. Dort ist die Konkurrenz um Wohnungen am härtesten. Unten rechts: viele leere
                Wohnungen und eine schrumpfende Bevölkerung, was die Mieten niedrig hält. Die waagrechte Achse ist am unteren Ende gestreckt, weil der Unterschied
                zwischen 1 % und 2 % Leerstand viel mehr zählt als zwischen 8 % und 9 %.</p>
              <p>Mit dem Suchfeld finden Sie Ihren Kreis in der Grafik.</p>
            </>)}>
            <SupplyDemandScatter data={kreise} highlight={highlight} />
          </Figure>
          <div style={{ maxWidth: 760 }}>
            <Takeaway>
              {t(<>Tight markets are not just a big-city problem: {tightRural} of the {counts.tight} tight districts are rural, most of them in{" "}
                {joinAnd(topLands("tight"))}. Slack markets cluster in {joinAnd(topLands("slack", 3))}, where so many flats stand empty that tenants have a real choice.</>,
              <>Angespannte Märkte sind nicht nur ein Großstadtproblem: {tightRural} der {counts.tight} angespannten Kreise sind Landkreise, die meisten davon in{" "}
                {joinAnd(topLands("tight"))}. Entspannte Märkte häufen sich in {joinAnd(topLands("slack", 3))}, wo so viele Wohnungen leer stehen, dass Mieter wirklich wählen können.</>)}
            </Takeaway>
          </div>
        </div>
      </section>

      <section className="section band" style={{ paddingBottom: 72 }}>
        <div className="wrap">
          <Head title={t("The ten tightest and ten slackest districts", "Die zehn angespanntesten und die zehn entspanntesten Kreise")} />
          <div className="split even">
            <Figure title={t("Tightest", "Am angespanntesten")} sub={t("Highest supply-demand index", "Höchster Angebot-Nachfrage-Index")} source={src}>
              <RankBars rows={tightest.map((k) => ({ label: k.kreis_name.split(",")[0], sub: sub(k), v: k.supply_demand_index }))}
                max={Math.max(...tightest.map((k) => k.supply_demand_index))} tone="bad" fmt="index" lang={lang} />
            </Figure>
            <Figure title={t("Slackest", "Am entspanntesten")} sub={t("Lowest supply-demand index (shown as distance below zero)", "Niedrigster Angebot-Nachfrage-Index (als Abstand unter null dargestellt)")} source={src}>
              <RankBars rows={slackest.map((k) => ({ label: k.kreis_name.split(",")[0], sub: sub(k), v: -k.supply_demand_index }))}
                max={Math.max(...slackest.map((k) => -k.supply_demand_index))} tone="good" fmt="index" lang={lang} />
            </Figure>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>{t("Does the index match what renters experience?", "Passt der Index zu dem, was Mieter erleben?")}</h2>
            <div className="prose" style={{ marginTop: 14 }}>
              {t(<p>The index uses census data, which is a snapshot. To check it, we compare it with live listing data for the 37 cities: how many{" "}
                <Term k="days-on-market" /> a flat stays online and how many are gone within a week. The correlation is{" "}
                <strong>{rs}</strong>{Math.abs(r) >= 0.4 ? ", so where the census says a market is tight, flats really do go faster." : "."}</p>,
              <p>Der Index beruht auf Zensusdaten, also einer Momentaufnahme. Zur Prüfung vergleichen wir ihn mit aktuellen Inseratsdaten der 37 Städte: der{" "}
                <Term k="days-on-market" /> und dem Anteil der Wohnungen, die innerhalb einer Woche weg sind. Die Korrelation beträgt{" "}
                <strong>{rs}</strong>{Math.abs(r) >= 0.4 ? ". Wo der Zensus einen angespannten Markt anzeigt, gehen Wohnungen also tatsächlich schneller weg." : "."}</p>)}
            </div>
          </div>
          <div className="tablewrap reveal">
            <table>
              <thead><tr><th>{t("City", "Stadt")}</th><th>{t("Market", "Markt")}</th><th className="num">{t("Empty flats", "Leerstand")}</th><th className="num">{t("Population, 5 y", "Bevölkerung, 5 J.")}</th><th className="num">{t("Days online", "Tage online")}</th><th className="num">Index</th></tr></thead>
              <tbody>
                {cityRows.map((c) => (
                  <tr key={c.city}>
                    <td><Link href={to(`/cities/${slugOf[c.city]}`)} style={{ fontWeight: 600 }}>{cityName(lang, c)}</Link></td>
                    <td>{c.market_balance && <span className={`pill ${c.market_balance}`}>{balance(lang, c.market_balance)}</span>}</td>
                    <td className="num">{pct(c.market_active_vacancy_pct)}</td>
                    <td className="num">{pct(c.population_growth_5y_pct, 1, true)}</td>
                    <td className="num">{num(c.time_on_market_days_4q)}</td>
                    <td className="num">{c.supply_demand_index != null ? num(c.supply_demand_index, 2) : fmt(lang).NA}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
