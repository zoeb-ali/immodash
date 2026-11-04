import Link from "next/link";
import { notFound } from "next/navigation";
import { BezirkeChart } from "@/components/BezirkeChart";
import { CitySwitcher } from "@/components/CitySwitcher";
import { ForecastChart, type HistPoint } from "@/components/ForecastChart";
import { LazyMount } from "@/components/LazyMount";
import { RentMap } from "@/components/RentMap";
import { PressureChart } from "@/components/PressureChart";
import { RankStrips, type Strip } from "@/components/RankStrips";
import { RentCheck } from "@/components/RentCheck";
import { Term } from "@/components/Term";
import { Figure, Head, Stat, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { fmt } from "@/lib/format";
import { balance, cityName, href, tx, type Lang } from "@/lib/i18n";
import { rentCheckCities } from "@/lib/story";

export function CityView({ lang, slug }: { lang: Lang; slug: string }) {
  const f = fmt(lang), t = tx(lang), de = lang === "de", to = (p: string) => href(lang, p);
  const { eur, inN, monthLong, num, ordinal, pct } = f;
  const cities = data.cities();
  const snap = cities.find((c) => c.slug === slug);
  if (!snap) notFound();
  const city = snap.city;
  const name = cityName(lang, snap);
  const monthly = data.monthly();
  const history: HistPoint[] = monthly.filter((r) => r.median_rent_sqm != null).map((r) => ({ c: r.city, d: r.period_date, m: r.median_rent_sqm as number }));
  const forecasts = data.forecasts();
  const own = forecasts.filter((x) => x.city === city);
  const anomalies = data.anomalies().filter((a) => a.city === city);
  const pressure = data.pressure().filter((p) => p.city === city);
  const summary = data.summary(slug);
  const kreis = data.supplyDemand().find((k) => k.ags === snap.ags);
  const sdCity = data.citySupplyDemand().find((c) => c.city === city);
  const bez = data.bezirke().filter((b) => b.bezirk_code.startsWith(snap.ags));
  const byRent = [...cities].sort((a, b) => b.median_rent_sqm - a.median_rent_sqm);
  const rank = byRent.findIndex((c) => c.city === city) + 1;
  const alpha = [...cities].sort((a, b) => cityName(lang, a).localeCompare(cityName(lang, b), lang));
  const idx = alpha.findIndex((c) => c.city === city);
  const prev = alpha[(idx - 1 + alpha.length) % alpha.length], next = alpha[(idx + 1) % alpha.length];
  const f12 = own.find((x) => x.horizon_months === 12);
  const llm = summary.generated_by.startsWith("groq");
  const flat = (snap.reference_monthly_rent_eur ?? snap.median_rent_sqm * 60);
  const lastP = pressure[pressure.length - 1];
  const yoy = snap.index_yoy_pct ?? 0;
  const tenseKey = (kreis?.market_balance ?? sdCity?.market_balance) ?? null;
  const tense = tenseKey ? balance(lang, tenseKey) : null;
  const notExact = snap.mapping_type !== "exact";
  const ink = { color: "var(--ink)" };
  const vals = (k: (c: (typeof cities)[number]) => number | null) => cities.map((c) => ({ city: c.city, city_en: c.city_en, v: k(c) }));

  const strips: Strip[] = [
    { key: "rent", label: t("Asking rent", "Angebotsmiete"), fmt: { d: 2, suffix: " €/m²" }, higherIs: t("most expensive", "teuerste zuerst"), lowerIs: t("cheapest", "günstigste zuerst"),
      values: vals((c) => c.median_rent_sqm) },
    { key: "yoy", label: t("Change in the last 12 months", "Veränderung in den letzten 12 Monaten"), fmt: { d: 1, suffix: de ? " %" : "%", sign: true },
      higherIs: t("fastest rise", "stärkster Anstieg zuerst"), lowerIs: t("weakest", "schwächster zuerst"), values: vals((c) => c.index_yoy_pct) },
    { key: "burden", label: t("Rent burden (60 m², two residents' income)", "Mietbelastung (60 m², Einkommen zweier Einwohner)"), fmt: { d: 1, suffix: de ? " %" : "%" },
      higherIs: t("least affordable", "am wenigsten bezahlbar zuerst"), lowerIs: t("most affordable", "am bezahlbarsten zuerst"), values: vals((c) => c.asking_rent_burden_pct) },
    { key: "premium", label: t("Extra for a new lease vs. 2022 tenants", "Aufschlag für Neuverträge ggü. Mietern von 2022"), fmt: { d: 0, suffix: de ? " %" : "%", sign: true },
      higherIs: t("largest gap", "größte Lücke zuerst"), lowerIs: t("smallest gap", "kleinste Lücke zuerst"), values: vals((c) => c.asking_premium_vs_existing_pct) },
    { key: "dom", label: t("Days a listing stays online", "Tage, die ein Inserat online bleibt"), fmt: { d: 0, suffix: t(" days", " Tage") },
      higherIs: t("slowest market", "langsamster Markt zuerst"), lowerIs: t("fastest market", "schnellster Markt zuerst"), values: vals((c) => c.time_on_market_days_4q) },
  ];
  const rankWords = de
    ? (rank === 1 ? "die höchste" : rank === cities.length ? "die niedrigste" : `Platz ${rank}`)
    : (rank === 1 ? "the highest" : rank === cities.length ? "the lowest" : `the ${ordinal(rank)} highest`);

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="crumbs enter" style={{ marginBottom: 28 }}>
            <Link href={to("/")}>ImmoDash</Link><span>/</span><Link href={to("/cities")}>{t("Cities", "Städte")}</Link><span>/</span><span>{name}</span>
            <span style={{ marginLeft: "auto" }}><CitySwitcher cities={cities} current={slug} /></span>
          </div>
          <div className="hero-grid">
            <div>
              <h1 className="enter">{t(`Renting in ${name}`, `Mieten in ${name}`)}</h1>
              <p className="lead enter">
                {t(<>A new lease costs <b style={ink}>{eur(snap.median_rent_sqm)}</b> per m², {rankWords} of
                  {" "}{cities.length} cities, {yoy >= 0 ? "up" : "down"} {pct(Math.abs(yoy), 1)} on a year ago{tense && <> in a <b style={ink}>{tense}</b> market</>}.</>,
                <>Ein neuer Mietvertrag kostet <b style={ink}>{eur(snap.median_rent_sqm)}</b> pro m², {rankWords} von {cities.length} Städten,
                  {" "}{pct(Math.abs(yoy), 1)} {yoy >= 0 ? "mehr" : "weniger"} als vor einem Jahr{tense && <>, auf einem <b style={ink}>{tense}en</b> Markt</>}.</>)}
              </p>
              <p className="meta enter" style={{ marginTop: 14 }}>{snap.land_name && snap.land_name !== snap.city && snap.land_name !== snap.city_en ? `${snap.land_name}. ` : ""}{t("Data up to", "Daten bis")} {monthLong(snap.latest_month)}.</p>
            </div>
            <div className="panel enter" style={{ padding: "6px 24px" }}>
              <ul className="stats one">
                <Stat label={t("A 60 m² flat, cold", "Eine 60-m²-Wohnung, kalt")} value={num(Math.round(flat / 10) * 10)} unit={t("€/mo", "€/Monat")}
                  say={t(<>Half of listings: {num(snap.p25_rent_sqm, 2)} to {num(snap.p75_rent_sqm, 2)} € per m².</>, <>Die Hälfte der Inserate: {num(snap.p25_rent_sqm, 2)} bis {num(snap.p75_rent_sqm, 2)} € pro m².</>)} />
                <Stat label={t("Change over five years", "Veränderung in fünf Jahren")} value={pct(snap.index_5y_pct, 0, true)}
                  say={t(<>{pct(yoy, 1, true)} in the last 12 months.</>, <>{pct(yoy, 1, true)} in den letzten 12 Monaten.</>)} />
                <Stat label={t("Rent burden", "Mietbelastung")} value={num(snap.asking_rent_burden_pct, 1)} unit="%"
                  say={t(<>Share of what two average residents earn after tax ({snap.income_year}).</>, <>Anteil am Nettoeinkommen zweier durchschnittlicher Einwohner ({snap.income_year}).</>)} />
                <Stat label={t("Forecast, next 12 months", "Prognose, nächste 12 Monate")} value={pct(f12?.change_p50_pct, 1, true)}
                  say={f12 ? t(<>Likely {num(f12.p10_rent_sqm, 2)} to {num(f12.p90_rent_sqm, 2)} € per m².</>, <>Wahrscheinlich {num(f12.p10_rent_sqm, 2)} bis {num(f12.p90_rent_sqm, 2)} € pro m².</>)
                    : t("No forecast available.", "Keine Prognose verfügbar.")} />
              </ul>
            </div>
          </div>
        </div>
      </header>

      <section className="section tight">
        <div className="wrap split wl">
          <div className="reveal">
            <h2 style={{ marginBottom: 18 }}>{t("The market in brief", "Der Markt in Kürze")}</h2>
            <div className="summary-lede" lang={de ? "en" : undefined}>
              {summary.text.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="ai-note">
              <span className="badge">{llm ? t("AI-written", "KI-geschrieben") : t("From the data", "Aus den Daten")}</span>
              {llm ? <span>{t(<>Written by an AI model ({summary.generated_by.split(":").slice(1).join(":")}). Every number was checked against the data before publishing.</>,
                <>Von einem KI-Modell geschrieben ({summary.generated_by.split(":").slice(1).join(":")}), bisher nur auf Englisch. Jede Zahl wurde vor der Veröffentlichung mit den Daten abgeglichen.</>)}</span>
                : <span>{t("Written from a template using the latest figures.", "Aus einer Vorlage mit den neuesten Zahlen erstellt, bisher nur auf Englisch.")}</span>}
            </div>
            <details className="howto" style={{ marginTop: 6 }}>
              <summary>{t("The facts this summary was allowed to use", "Die Fakten, die diese Zusammenfassung verwenden durfte")}</summary>
              <div className="body"><pre>{JSON.stringify(summary.facts, null, 2)}</pre></div>
            </details>
          </div>
          <div className="panel reveal">
            <h3 style={{ marginBottom: 4 }}>{t(`How ${name} compares`, `${name} im Vergleich`)}</h3>
            <p className="note" style={{ marginBottom: 18 }}>{t(<>Each dot is one of the {cities.length} cities; blue is {name}. Hover a grey dot to see which.</>,
              <>Jeder Punkt ist eine der {cities.length} Städte; blau ist {name}. Fahren Sie über einen grauen Punkt, um zu sehen, welche.</>)}</p>
            <RankStrips strips={strips} city={city} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title={t(`Where rents in ${name} are heading`, `Wohin sich die Mieten in ${name} entwickeln`)}>
            {t(<>The solid line is the median <Term k="asking-rent" /> each month; the dashed line and band are the model&apos;s forecast.</>,
              <>Die durchgezogene Linie ist die mittlere <Term k="asking-rent" /> jedes Monats; gestrichelte Linie und Band sind die Prognose des Modells.</>)}
            {f12 && t(<> In a year, a 60 m² flat would most likely be listed at about <b style={ink}>{num(Math.round((f12.p50_rent_sqm * 60) / 10) * 10)} €</b> a month,
              against {num(Math.round(flat / 10) * 10)} € today.</>,
              <> In einem Jahr würde eine 60-m²-Wohnung am wahrscheinlichsten für etwa <b style={ink}>{num(Math.round((f12.p50_rent_sqm * 60) / 10) * 10)} €</b> im Monat
              inseriert, gegenüber {num(Math.round(flat / 10) * 10)} € heute.</>)}
          </Head>
          <Figure title={t(`Median asking rent in ${name}, € per m²`, `Mittlere Angebotsmiete in ${name}, € pro m²`)}
            sub={t("Monthly, with the 3, 6 and 12-month forecast and its 80% range. Use the menu to compare another city.",
              "Monatlich, mit der Prognose für 3, 6 und 12 Monate und ihrer 80-%-Spanne. Über das Menü lässt sich eine andere Stadt vergleichen.")}
            source={t("GREIX Mietpreisindex; ImmoDash forecast model.", "GREIX Mietpreisindex; ImmoDash-Prognosemodell.")}
            howto={<>
              {t(<p>The band widens further into the future because uncertainty grows with time. In back-tests, about 8 out of 10 real outcomes fell
                inside bands like this one.</p>,
                <p>Das Band wird nach vorne breiter, weil die Unsicherheit mit der Zeit wächst. Im Backtest lagen etwa 8 von 10 echten Ergebnissen
                in solchen Bändern.</p>)}
              {anomalies.length > 0 && t(<p>Dashed circles mark <Term k="anomaly">unusual months</Term>: moves much larger than in the other cities that month.</p>,
                <p>Gestrichelte Kreise markieren <Term k="anomaly">auffällige Monate</Term>: Bewegungen, die viel größer waren als in den anderen Städten im selben Monat.</p>)}
            </>}>
            <ForecastChart city={city} cityEn={name} history={history} forecasts={forecasts} anomalies={anomalies}
              others={alpha.filter((c) => c.city !== city).map((c) => ({ city: c.city, city_en: cityName(lang, c) }))} />
          </Figure>
          {anomalies.length > 0 && (
            <div className="split even reveal" style={{ marginTop: 36 }}>
              <div>
                <h3 style={{ marginBottom: 12 }}>{t("Unusual months, in plain words", "Auffällige Monate, einfach erklärt")}</h3>
                <ul className="list">
                  {anomalies.slice(0, 4).map((a) => (
                    <li key={a.period_date}>
                      {t(<>In {monthLong(a.period_date)} asking rents {a.direction === "spike" ? "jumped" : "fell"} {pct(Math.abs(a.mom_pct), 1)} in a single month,
                        while the typical city moved {pct(a.market_mom_pct, 1, true)}.</>,
                      <>Im {monthLong(a.period_date)} {a.direction === "spike" ? "sprangen" : "fielen"} die Angebotsmieten in einem einzigen Monat um {pct(Math.abs(a.mom_pct), 1)},
                        während sich die typische Stadt um {pct(a.market_mom_pct, 1, true)} bewegte.</>)}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="prose" style={{ margin: 0, alignSelf: "end" }}>{t(
                "One month is a small sample, so a flag like this is a prompt to look closer rather than proof of a price change. The longer trend is the better guide.",
                "Ein Monat ist eine kleine Stichprobe. Eine solche Markierung ist daher ein Anlass, genauer hinzusehen, kein Beweis für eine Preisänderung. Der längere Trend ist der bessere Wegweiser.")}</p>
            </div>
          )}
        </div>
      </section>

      <section className="section band" style={{ paddingBottom: 72 }}>
        <div className="wrap">
          <Head title={t("Not every street costs the same", "Nicht jede Straße kostet gleich viel")}>
            {t(<>The 2022 census recorded rents on existing leases for every 100 by 100 metre square. Darker blue is more expensive. These are
              existing contracts, cheaper than today&apos;s asking rents, but the pattern of dear and cheap areas is the same.</>,
              <>Der Zensus 2022 hat die Mieten laufender Verträge für jedes Quadrat von 100 mal 100 Metern erfasst. Dunkleres Blau ist teurer. Es sind
              Bestandsverträge, günstiger als heutige Angebotsmieten, aber das Muster aus teuren und günstigen Gegenden ist dasselbe.</>)}
            {notExact && t(" For this city the map covers the whole surrounding district.", " Für diese Stadt zeigt die Karte den gesamten umliegenden Kreis.")}
          </Head>
          <div className={bez.length ? "split wl" : ""}>
            <Figure title={t(`Rent per 100 m square, ${name}`, `Miete je 100-m-Quadrat, ${name}`)}
              sub={t("Average net cold rent on existing contracts, May 2022, on a street map. Hover for values; drag to move.",
                "Durchschnittliche Nettokaltmiete laufender Verträge, Mai 2022, auf einem Stadtplan. Für Werte darüberfahren; zum Verschieben ziehen.")}
              source={t("Zensus 2022 grid data (100 m); squares with too few flats are left out. Basemap: OpenFreeMap, © OpenMapTiles, map data © OpenStreetMap contributors.",
                "Zensus 2022, Gitterdaten (100 m); Quadrate mit zu wenigen Wohnungen sind ausgelassen. Grundkarte: OpenFreeMap, © OpenMapTiles, Kartendaten © OpenStreetMap-Mitwirkende.")}
              howto={t(<p>The colour scale runs from the cheapest 2% to the most expensive 2% of squares, so a few extreme squares don&apos;t wash out the
                rest. A blank area means no or too few rented flats there (parks, industry, water) or the census suppressed the value.</p>,
                <p>Die Farbskala reicht von den günstigsten 2 % bis zu den teuersten 2 % der Quadrate, damit wenige Extremwerte den Rest nicht überdecken.
                Eine leere Fläche heißt: dort keine oder zu wenige Mietwohnungen (Parks, Industrie, Wasser), oder der Zensus hat den Wert unterdrückt.</p>)}>
              <LazyMount minHeight={560} margin="400px"><RentMap ags={snap.ags} city={name} /></LazyMount>
            </Figure>
            {bez.length > 0 && (
              <Figure title={t("By borough (Bezirk)", "Nach Bezirk")}
                sub={t(`Average rent on existing leases, 2022. Red is above the ${name} average, blue below.`, `Durchschnittliche Bestandsmiete, 2022. Rot liegt über dem Durchschnitt von ${name}, blau darunter.`)}
                source="Zensus 2022.">
                <BezirkeChart data={bez} />
              </Figure>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>{t("How fast flats are let", "Wie schnell Wohnungen vermietet werden")}</h2>
            <div className="prose" style={{ marginTop: 16 }}>
              {lastP?.time_on_market_days_4q != null && t(
                <p>A listing in {name} stays online for about <strong>{num(lastP.time_on_market_days_4q)} days</strong>
                  {lastP.share_closed_within_week_4q != null && <>, and {inN(lastP.share_closed_within_week_4q)} flats are gone within a week</>}.
                  {" "}Fewer <Term k="days-on-market" /> means more competition: have your documents (SCHUFA, payslips) ready before you view.</p>,
                <p>Ein Inserat in {name} bleibt etwa <strong>{num(lastP.time_on_market_days_4q)} Tage</strong> online
                  {lastP.share_closed_within_week_4q != null && <>, und {inN(lastP.share_closed_within_week_4q)} Wohnungen sind innerhalb einer Woche weg</>}.
                  {" "}Eine kürzere <Term k="days-on-market" /> heißt mehr Konkurrenz: Halten Sie Ihre Unterlagen (SCHUFA, Gehaltsnachweise) vor der Besichtigung bereit.</p>)}
              {kreis && t(<p>The census found <strong>{pct(kreis.market_active_vacancy_pct, 1)}</strong> of flats empty and available
                (<Term k="vacancy" />), while the population grew {pct(kreis.population_growth_5y_pct, 1, true)} in five years. That makes the
                market <strong>{balance(lang, kreis.market_balance)}</strong> on our <Term k="supply-demand" />.</p>,
                <p>Der Zensus fand <strong>{pct(kreis.market_active_vacancy_pct, 1)}</strong> der Wohnungen leer und verfügbar
                (<Term k="vacancy" />), während die Bevölkerung in fünf Jahren um {pct(kreis.population_growth_5y_pct, 1, true)} wuchs. Damit ist der
                Markt auf unserem <Term k="supply-demand" /> <strong>{balance(lang, kreis.market_balance)}</strong>.</p>)}
            </div>
          </div>
          <Figure title={t("Days a listing stays online", "Tage, die ein Inserat online bleibt")}
            sub={t("Rolling average over four quarters. Lower means a faster, tighter market.", "Gleitender Durchschnitt über vier Quartale. Niedriger heißt schnellerer, engerer Markt.")}
            source={t("GREIX market-pressure data.", "GREIX-Daten zum Marktdruck.")}>
            <PressureChart data={pressure} />
          </Figure>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title={t(`What would a flat in ${name} cost you?`, `Was würde Sie eine Wohnung in ${name} kosten?`)} />
          <div className="reveal"><RentCheck cities={rentCheckCities()} initialCity={city} compact /></div>
          <div style={{ maxWidth: 720 }}>
            <Takeaway label={t("Before you sign", "Bevor Sie unterschreiben")}>
              {t(<>Asking rents here are {pct(snap.asking_premium_vs_existing_pct, 0)} above what existing tenants paid in 2022. Check the
                Mietspiegel for {name} and whether the rent cap (Mietpreisbremse) applies to your flat: it can limit how far a new
                rent may exceed the local reference rent.</>,
              <>Die Angebotsmieten liegen hier {pct(snap.asking_premium_vs_existing_pct, 0)} über dem, was Bestandsmieter 2022 zahlten. Prüfen Sie den
                Mietspiegel für {name} und ob die Mietpreisbremse für Ihre Wohnung gilt: Sie kann begrenzen, wie weit eine neue Miete die
                ortsübliche Vergleichsmiete übersteigen darf.</>)}
            </Takeaway>
          </div>
          <nav className="pager" aria-label={t("Other cities", "Weitere Städte")}>
            <Link href={to(`/cities/${prev.slug}`)}><span>{t("Previous city", "Vorherige Stadt")}</span><b>{cityName(lang, prev)}</b></Link>
            <Link href={to(`/cities/${next.slug}`)} style={{ textAlign: "right" }}><span>{t("Next city", "Nächste Stadt")}</span><b>{cityName(lang, next)}</b></Link>
          </nav>
        </div>
      </section>
    </>
  );
}
