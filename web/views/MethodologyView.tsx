import { BacktestChart } from "@/components/BacktestChart";
import { Figure, Head, PageHero, Stat, Takeaway } from "@/components/ui";
import { Cite } from "@/components/Cite";
import { data } from "@/lib/data";
import { REFERENCES } from "@/lib/references";
import { fmt } from "@/lib/format";
import { tx, type Lang } from "@/lib/i18n";

type Step = { n: string; t: string; d: string; tech: string };
const STEPS: Record<Lang, Step[]> = {
  en: [
    { n: "1", t: "Collect", d: "Eleven open datasets: Zensus 2022, GREIX listings, Bundesbank loan rates, regional incomes, district and postcode boundaries.", tech: "Python ingestion, raw files kept as-is (bronze)" },
    { n: "2", t: "Clean and test", d: "Tables are joined to Germany's 400 districts and checked automatically: no gaps, no impossible values.", tech: "dbt on DuckDB / PostgreSQL, data tests on every run" },
    { n: "3", t: "Model", d: "A forecasting model predicts each city's rent 3, 6 and 12 months ahead, and unusual months are flagged.", tech: "LightGBM quantile regression, conformal intervals, robust z-scores" },
    { n: "4", t: "Serve", d: "Every number on this site comes from one typed interface, so the website and analyst tools never disagree.", tech: "FastAPI, 25 endpoints, Pydantic contracts" },
    { n: "5", t: "Explain", d: "An AI model writes each city summary from a fixed list of facts. If it uses a number that is not in the list, the text is thrown away.", tech: "Groq LLM + numeric grounding check" },
    { n: "6", t: "Publish", d: "Every Monday the whole chain reruns and this site is rebuilt from the fresh data.", tech: "GitHub Actions, Next.js static export on Vercel" },
  ],
  de: [
    { n: "1", t: "Sammeln", d: "Elf offene Datensätze: Zensus 2022, GREIX-Inserate, Bauzinsen der Bundesbank, regionale Einkommen, Kreis- und Postleitzahlgrenzen.", tech: "Python-Ingestion, Rohdateien unverändert gespeichert (Bronze)" },
    { n: "2", t: "Bereinigen und testen", d: "Die Tabellen werden den 400 Kreisen Deutschlands zugeordnet und automatisch geprüft: keine Lücken, keine unmöglichen Werte.", tech: "dbt auf DuckDB / PostgreSQL, Datentests bei jedem Lauf" },
    { n: "3", t: "Modellieren", d: "Ein Prognosemodell sagt die Miete jeder Stadt 3, 6 und 12 Monate voraus, und auffällige Monate werden markiert.", tech: "LightGBM-Quantilsregression, konforme Intervalle, robuste z-Werte" },
    { n: "4", t: "Bereitstellen", d: "Jede Zahl auf dieser Seite kommt aus einer typisierten Schnittstelle, damit Website und Analysewerkzeuge nie voneinander abweichen.", tech: "FastAPI, 25 Endpunkte, Pydantic-Verträge" },
    { n: "5", t: "Erklären", d: "Ein KI-Modell schreibt jede Stadtzusammenfassung aus einer festen Faktenliste. Nutzt es eine Zahl, die nicht auf der Liste steht, wird der Text verworfen.", tech: "Groq-LLM + Zahlenabgleich" },
    { n: "6", t: "Veröffentlichen", d: "Jeden Montag läuft die ganze Kette neu, und diese Seite wird aus den frischen Daten neu gebaut.", tech: "GitHub Actions, statischer Next.js-Export auf Vercel" },
  ],
};

type Metric = { k: string; plain: string; formula: string; refs?: string[] };
const METRICS: Record<Lang, Metric[]> = {
  en: [
    { k: "Asking rent", plain: "The middle price per m² of flats advertised for rent in a month. Half of the listings cost more, half cost less.", formula: "Median of listing prices, GREIX hedonic index (adjusts for flat size and quality)", refs: ["greix-rent", "eurostat2013"] },
    { k: "Asking rent vs. 2022 leases", plain: "How far today's median asking rent lies above the average rent of all existing contracts in May 2022. Not a like-for-like price change: it mixes four years of growth, a different mix of flats (median of new listings vs. mean of all leases) and old leases that were rarely raised.", formula: "Median asking rent (latest month) ÷ Zensus 2022 mean contract rent − 1", refs: ["bbsr-rents"] },
    { k: "Rent burden (asking rent)", plain: "How much of the income of two average residents today's rent for a 60 m² flat would take. Caveats: the latest income figures are for 2023, and income per resident averages over children and pensioners too.", formula: "Asking rent × 60 m² × 12 ÷ (2 × disposable income per resident, latest year)" },
    { k: "Rent burden (2022 census rents)", plain: "The same measure with the average rent existing tenants paid in 2022, used to compare all 400 districts on one footing. It is lower than the burden at today's asking rents.", formula: "Zensus 2022 rent × 60 m² × 12 ÷ (2 × disposable income per resident)" },
    { k: "Affordability index", plain: "The rent burden compared with the typical German district: 100 is average, higher is more affordable.", formula: "Median district burden ÷ district burden × 100" },
    { k: "Estimated asking rent (districts)", plain: "For districts without listing data: the census rent raised by the gap between census and asking rents seen in nearby tracked cities.", formula: "Zensus rent × (1 + premium of the city, else state median, else national median)" },
    { k: "Rent range within a district", plain: "Rents differ from street to street. The range shows the cheaper and dearer ends of a district, leaving out the cheapest and dearest 10% of its area.", formula: "District estimate × (10th and 90th percentile ÷ median) of Zensus grid cells: 100 m in the 37 cities, 1 km elsewhere" },
    { k: "Postcode estimate", plain: "For the 37 cities: how a postcode compares with the rest of its city, applied to the city-wide estimate.", formula: "District estimate × median grid rent of the postcode's 100 m cells ÷ city median (postcode areas: OpenStreetMap)" },
    { k: "Supply-demand index", plain: "High when few flats are empty and the population is growing.", formula: "z(population growth 2018 to 2023) − z(empty and available flats, 2022); ≥ 1 tight, ≤ −1 slack", refs: ["bgb556d", "saxony2022"] },
    { k: "Live market pressure", plain: "How quickly flats are let in practice: days online and the share gone within a week.", formula: "Mean z-score of (inverted) days on market and share let within a week, per quarter" },
    { k: "Unusual month", plain: "A month where one city's quality-adjusted rent index moved far more than the others, compared with its own last two years, and the move held the next month.", formula: "Index change minus all-city median change; robust z vs. previous 24 months; |z| ≥ 3.5; not reversed by more than half the next month", refs: ["iglewicz1993"] },
    { k: "Forecast level", plain: "Forecasts are percentage changes of the hedonic index, applied to a three-month average of the median asking rent, and labelled with the month they are for.", formula: "3-month mean median × exp(predicted log change of the index to the target month)" },
  ],
  de: [
    { k: "Angebotsmiete", plain: "Der mittlere Preis pro m² der in einem Monat inserierten Mietwohnungen. Die Hälfte der Inserate kostet mehr, die Hälfte weniger.", formula: "Median der Inseratspreise, hedonischer GREIX-Index (bereinigt um Größe und Qualität)", refs: ["greix-rent", "eurostat2013"] },
    { k: "Angebotsmiete ggü. Bestand 2022", plain: "Wie weit die heutige mittlere Angebotsmiete über der Durchschnittsmiete aller laufenden Verträge im Mai 2022 liegt. Kein Preisvergleich derselben Wohnung: Darin stecken vier Jahre Anstieg, eine andere Mischung von Wohnungen (Median neuer Inserate gegenüber Mittelwert aller Verträge) und alte, selten erhöhte Verträge.", formula: "Mittlere Angebotsmiete (letzter Monat) ÷ mittlere Vertragsmiete Zensus 2022 − 1", refs: ["bbsr-rents"] },
    { k: "Mietbelastung (Angebotsmiete)", plain: "Wie viel vom Einkommen zweier durchschnittlicher Einwohner die heutige Miete für eine 60-m²-Wohnung nehmen würde. Einschränkungen: Die neuesten Einkommensdaten sind von 2023, und das Pro-Kopf-Einkommen mittelt auch über Kinder und Rentner.", formula: "Angebotsmiete × 60 m² × 12 ÷ (2 × verfügbares Einkommen je Einwohner, letztes Jahr)" },
    { k: "Mietbelastung (Zensusmieten 2022)", plain: "Dasselbe Maß mit der Durchschnittsmiete, die Bestandsmieter 2022 zahlten, um alle 400 Kreise auf gleicher Grundlage zu vergleichen. Sie liegt unter der Belastung zu heutigen Angebotsmieten.", formula: "Zensusmiete 2022 × 60 m² × 12 ÷ (2 × verfügbares Einkommen je Einwohner)" },
    { k: "Erschwinglichkeitsindex", plain: "Die Mietbelastung im Vergleich zum typischen deutschen Kreis: 100 ist Durchschnitt, höher ist bezahlbarer.", formula: "Median der Kreisbelastung ÷ Belastung des Kreises × 100" },
    { k: "Geschätzte Angebotsmiete (Kreise)", plain: "Für Kreise ohne Inseratsdaten: die Zensusmiete, erhöht um die Lücke zwischen Zensus- und Angebotsmieten in benachbarten erfassten Städten.", formula: "Zensusmiete × (1 + Aufschlag der Stadt, sonst Median des Landes, sonst bundesweiter Median)" },
    { k: "Mietspanne innerhalb eines Kreises", plain: "Mieten unterscheiden sich von Straße zu Straße. Die Spanne zeigt das günstigere und das teurere Ende eines Kreises, ohne die günstigsten und teuersten 10 % seiner Fläche.", formula: "Kreisschätzung × (10. und 90. Perzentil ÷ Median) der Zensus-Gitterzellen: 100 m in den 37 Städten, sonst 1 km" },
    { k: "Schätzung je Postleitzahl", plain: "Für die 37 Städte: wie eine Postleitzahl im Vergleich zum Rest ihrer Stadt liegt, angewendet auf die stadtweite Schätzung.", formula: "Kreisschätzung × mittlere Gittermiete der 100-m-Zellen der Postleitzahl ÷ Stadtmedian (PLZ-Gebiete: OpenStreetMap)" },
    { k: "Angebot-Nachfrage-Index", plain: "Hoch, wenn wenige Wohnungen leer stehen und die Bevölkerung wächst.", formula: "z(Bevölkerungswachstum 2018 bis 2023) − z(leere, verfügbare Wohnungen, 2022); ≥ 1 angespannt, ≤ −1 entspannt", refs: ["bgb556d", "saxony2022"] },
    { k: "Aktueller Marktdruck", plain: "Wie schnell Wohnungen in der Praxis vermietet werden: Tage online und Anteil, der innerhalb einer Woche weg ist.", formula: "Mittlerer z-Wert aus (invertierter) Vermarktungsdauer und Anteil innerhalb einer Woche vermietet, je Quartal" },
    { k: "Auffälliger Monat", plain: "Ein Monat, in dem sich der qualitätsbereinigte Mietindex einer Stadt viel stärker bewegt hat als die anderen, verglichen mit ihren eigenen letzten zwei Jahren, und die Bewegung im Folgemonat hielt.", formula: "Indexveränderung minus Median aller Städte; robuster z-Wert ggü. den 24 Vormonaten; |z| ≥ 3,5; im Folgemonat nicht mehr als zur Hälfte zurückgegangen", refs: ["iglewicz1993"] },
    { k: "Prognoseniveau", plain: "Prognosen sind prozentuale Veränderungen des hedonischen Index, angewendet auf einen Dreimonatsdurchschnitt der mittleren Angebotsmiete, und tragen den Monat, für den sie gelten.", formula: "Dreimonatsmittel des Medians × exp(vorhergesagte log-Veränderung des Index bis zum Zielmonat)" },
  ],
};

const MODEL_NAMES: Record<Lang, Record<string, string>> = {
  en: { lightgbm: "ImmoDash model", drift_last_12m: "Trend continues", naive_no_change: "No change" },
  de: { lightgbm: "ImmoDash-Modell", drift_last_12m: "Trend setzt sich fort", naive_no_change: "Keine Veränderung" },
};

export function MethodologyView({ lang }: { lang: Lang }) {
  const f = fmt(lang), t = tx(lang), de = lang === "de";
  const { num, pct } = f;
  const sources = data.sources(), bt = data.backtest(), meta = data.meta(), btCity = data.backtestCities();
  const fresh = Object.fromEntries(data.freshness().map((x) => [x.source_key, x]));
  const freshFor = (key: string) => fresh[key] ?? fresh[key.startsWith("zensus") ? "zensus" : key.startsWith("greix_rent_vs") ? "greix_rent_vs_sales" : key];
  const val = data.estimateValidation();
  const absErr = val.map((v) => Math.abs(v.error_pct)).sort((a, b) => a - b);
  const valMed = absErr[Math.floor(absErr.length / 2)], valP80 = absErr[Math.floor(absErr.length * 0.8)], valMax = absErr[absErr.length - 1];
  const get = (h: number, m: string) => bt.find((b) => b.horizon_months === h && b.model === m);
  const lg12 = get(12, "lightgbm"), nv12 = get(12, "naive_no_change"), tr12 = get(12, "drift_last_12m");
  const better = lg12 && nv12 ? Math.round((1 - lg12.mape_pct / nv12.mape_pct) * 100) : null;
  const strong = { color: "var(--ink)" };
  return (
    <>
      <PageHero full de={de} title={t("How ImmoDash works", "So funktioniert ImmoDash")}
        lead={t("Eleven public datasets become one tested picture of the German rental market, rebuilt automatically every week.",
          "Aus elf öffentlichen Datensätzen wird ein geprüftes Bild des deutschen Mietmarkts, jede Woche automatisch neu erstellt.")}
        label={t("The pipeline at a glance", "Die Pipeline auf einen Blick")}
        facts={<>
          <Stat label={t("Last automatic run", "Letzter automatischer Lauf")} value={f.day(meta.generated_at, "short")} say={t("Rebuilt every Monday by GitHub Actions.", "Jeden Montag per GitHub Actions neu erstellt.")} />
          <Stat label={t("Data files", "Datendateien")} value={meta.files}
            say={t(<>Published by one tested pipeline{meta.summaries_by_llm > 0 && <>, with {meta.summaries_by_llm} AI-written city summaries</>}.</>,
              <>Von einer geprüften Pipeline veröffentlicht{meta.summaries_by_llm > 0 && <>, mit {meta.summaries_by_llm} KI-geschriebenen Stadtzusammenfassungen</>}.</>)} />
          <Stat label={t("Checks", "Prüfungen")} value={meta.data_tests ?? f.NA} unit={t("data tests", "Datentests")} say={t("Run before anything is published.", "Laufen, bevor etwas veröffentlicht wird.")} />
          <Stat label={t("References", "Quellen")} value={REFERENCES.length} unit={t("publications", "Publikationen")}
            say={t(<>Back the explanations. <a href="#references">See the list</a>.</>, <>Belegen die Erklärungen. <a href="#references">Zur Liste</a>.</>)} />
        </>} />

      <section className="section tight">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>{t("From raw files to this page", "Von Rohdaten zu dieser Seite")}</h2>
            <p className="prose" style={{ marginTop: 14 }}>{t("Each step is automated and tested. If any step fails, nothing is published and the site keeps the last good data.",
              "Jeder Schritt ist automatisiert und getestet. Schlägt ein Schritt fehl, wird nichts veröffentlicht, und die Seite behält die letzten guten Daten.")}</p>
          </div>
          <ol className="steps reveal">
            {STEPS[lang].map((st) => (
              <li key={st.n}>
                <span className="n">{st.n.padStart(2, "0")}</span>
                <div><h3>{st.t}</h3><p>{st.d}</p></div>
                <span className="tech">{st.tech}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section band" style={{ paddingBottom: 72 }}>
        <div className="wrap">
          <Head title={t("We tested the model on data it had never seen", "Wir haben das Modell an Daten getestet, die es nie gesehen hatte")}>
            {t(<>We repeatedly cut the data at an earlier month, trained only on what was known then, and compared the forecast with what happened.
              Every quarter from {lg12 ? f.monthLong(lg12.first_origin) : "2015"} to {lg12 ? f.monthLong(lg12.last_origin) : "2025"} ({lg12?.n_origins} starting points
              for 12 months ahead), all 37 cities.<Cite id="hyndman2021" /></>,
              <>Wir haben die Daten wiederholt an einem früheren Monat abgeschnitten, nur mit dem damals Bekannten trainiert und die Prognose mit dem verglichen,
              was dann passierte. Jedes Quartal von {lg12 ? f.monthLong(lg12.first_origin) : "2015"} bis {lg12 ? f.monthLong(lg12.last_origin) : "2025"} ({lg12?.n_origins} Startpunkte
              für 12 Monate), alle 37 Städte.<Cite id="hyndman2021" /></>)}
          </Head>
          <div className="split">
            <div className="reveal">
              {lg12 && nv12 && tr12 && <div className="prose">{t(<><p>Over 12 months the model was off by <strong>{pct(lg12.mape_pct, 2)}</strong> on average. Assuming
                rents stay the same was off by {pct(nv12.mape_pct, 2)}, and extending last year&apos;s trend by {pct(tr12.mape_pct, 2)}.
                {better != null && <> That is about {better}% smaller errors than the no-change guess.</>}</p>
                <p>{num(lg12.coverage_80_pct)}% of real outcomes fell inside the model&apos;s 80% range, close to the 80% it promises. It got the
                  direction (rise or fall) right in {num(lg12.direction_accuracy_pct)}% of cases, and on average its forecasts were{" "}
                  {pct(Math.abs(lg12.bias_pct), 2)} too {lg12.bias_pct > 0 ? "high" : "low"}.</p>
                <p><b>Limit:</b> rents fell over a 12-month period in only {lg12.n_falls} of {lg12.n_forecasts} test cases, so the model has seen
                  very few falls and almost never predicts one. Where its forecast points against a city&apos;s own last 12 months, the city page
                  says so. Accuracy per city is in the table under the chart.</p></>,
                <><p>Über 12 Monate lag das Modell im Schnitt um <strong>{pct(lg12.mape_pct, 2)}</strong> daneben. Die Annahme gleichbleibender
                Mieten lag um {pct(nv12.mape_pct, 2)} daneben, das Fortschreiben des Vorjahrestrends um {pct(tr12.mape_pct, 2)}.
                {better != null && <> Das sind etwa {better} % kleinere Fehler als bei der Annahme „keine Veränderung“.</>}</p>
                <p>{num(lg12.coverage_80_pct)} % der echten Ergebnisse lagen in der 80-%-Spanne des Modells, nah an den versprochenen 80 %. Die Richtung
                  (Anstieg oder Rückgang) stimmte in {num(lg12.direction_accuracy_pct)} % der Fälle, und im Schnitt lagen die Prognosen{" "}
                  {pct(Math.abs(lg12.bias_pct), 2)} zu {lg12.bias_pct > 0 ? "hoch" : "niedrig"}.</p>
                <p><b>Grenze:</b> Nur in {lg12.n_falls} von {lg12.n_forecasts} Testfällen fielen die Mieten über 12 Monate. Das Modell hat also kaum
                  Rückgänge gesehen und sagt fast nie einen voraus. Wo seine Prognose gegen den Trend der letzten 12 Monate einer Stadt zeigt, steht das auf
                  der Stadtseite. Die Genauigkeit je Stadt steht in der Tabelle unter der Grafik.</p></>)}</div>}
              <Takeaway label={t("In short", "Kurz gesagt")}>
                {t(<>The model beats the obvious shortcuts at every horizon, and its ranges are honest. It only knows past rents, so it cannot foresee
                  new laws or a sudden building boom.</>,
                  <>Das Modell schlägt die naheliegenden Abkürzungen bei jedem Horizont, und seine Spannen sind ehrlich. Es kennt nur vergangene Mieten und
                  kann daher keine neuen Gesetze oder einen plötzlichen Bauboom vorhersehen.</>)}
              </Takeaway>
            </div>
            <Figure title={t("Average forecast error, lower is better", "Durchschnittlicher Prognosefehler, niedriger ist besser")}
              sub={t("Mean absolute percentage error, out of sample.", "Mittlerer absoluter prozentualer Fehler, außerhalb der Stichprobe.")}
              source={t("ImmoDash back-test.", "ImmoDash-Backtest.")} numbers={<>
                <table><thead><tr><th>{t("Horizon", "Horizont")}</th><th>{t("Model", "Modell")}</th><th className="num">{t("Error", "Fehler")}</th><th className="num">{t("Bias", "Verzerrung")}</th><th className="num">{t("Direction right", "Richtung richtig")}</th><th className="num">{t("80% range hit rate", "Trefferquote 80-%-Spanne")}</th></tr></thead>
                <tbody>{bt.map((b) => <tr key={b.horizon_months + b.model}><td>{b.horizon_months} {t("months", "Monate")}</td><td>{MODEL_NAMES[lang][b.model] ?? b.model}</td><td className="num">{pct(b.mape_pct, 2)}</td><td className="num">{pct(b.bias_pct, 2, true)}</td><td className="num">{pct(b.direction_accuracy_pct, 0)}</td><td className="num">{b.coverage_80_pct != null ? pct(b.coverage_80_pct, 0) : f.NA}</td></tr>)}</tbody></table>
                <p className="note" style={{ margin: "14px 0 6px" }}>{t("ImmoDash model, 12 months ahead, per city:", "ImmoDash-Modell, 12 Monate, je Stadt:")}</p>
                <table><thead><tr><th>{t("City", "Stadt")}</th><th className="num">{t("Error", "Fehler")}</th><th className="num">{t("Bias", "Verzerrung")}</th><th className="num">{t("Direction right", "Richtung richtig")}</th><th className="num">{t("80% range hit rate", "Trefferquote 80-%-Spanne")}</th></tr></thead>
                <tbody>{btCity.filter((b) => b.horizon_months === 12).sort((a, b) => b.mape_pct - a.mape_pct).map((b) => <tr key={b.city}><td>{b.city}</td><td className="num">{pct(b.mape_pct, 2)}</td><td className="num">{pct(b.bias_pct, 2, true)}</td><td className="num">{pct(b.direction_accuracy_pct, 0)}</td><td className="num">{b.coverage_80_pct != null ? pct(b.coverage_80_pct, 0) : f.NA}</td></tr>)}</tbody></table>
              </>}>
              <BacktestChart data={bt} />
            </Figure>
          </div>
        </div>
      </section>

      <section className="section" id="estimates">
        <div className="wrap">
          <Head title={t("How good are the district estimates?", "Wie gut sind die Kreisschätzungen?")}>
            {t(<>Only 37 of 400 districts have listing data. For the other {400 - val.length} the asking rent is the 2022 census rent raised by the typical
              gap in tracked cities of the same state. To test that rule we pretend each tracked city had no listing data, estimate it from the
              others, and compare with its real asking rent.</>,
              <>Nur 37 von 400 Kreisen haben Inseratsdaten. Für die übrigen {400 - val.length} ist die Angebotsmiete die Zensusmiete 2022, angehoben um die
              typische Lücke in erfassten Städten desselben Landes. Um diese Regel zu testen, tun wir so, als hätte jede erfasste Stadt keine Inseratsdaten,
              schätzen sie aus den anderen und vergleichen mit ihrer echten Angebotsmiete.</>)}
          </Head>
          <div className="split even">
            <div className="prose reveal">
              {t(<><p>The rule missed the real asking rent by <strong>{pct(valMed, 1)}</strong> in the typical city, by up to {pct(valP80, 1)} in 8 of 10
                cities, and by {pct(valMax, 1)} at worst. Every modelled district on the map therefore carries a range of ±{pct(valP80, 0)}, and is
                marked as modelled.</p>
                <p>The test cities are all large. Rural districts may be estimated less well than this shows, so treat their figures as a
                  rough guide and check real listings.</p></>,
              <><p>Die Regel lag in der typischen Stadt <strong>{pct(valMed, 1)}</strong> neben der echten Angebotsmiete, in 8 von 10 Städten höchstens
                {" "}{pct(valP80, 1)} und im schlechtesten Fall {pct(valMax, 1)}. Jeder modellierte Kreis auf der Karte trägt daher eine Spanne von
                ±{pct(valP80, 0)} und ist als modelliert gekennzeichnet.</p>
                <p>Die Teststädte sind alle groß. Landkreise werden womöglich schlechter geschätzt, als dieser Test zeigt; nutzen Sie ihre Werte als grobe
                  Orientierung und prüfen Sie echte Inserate.</p></>)}
            </div>
            <div className="tablewrap reveal" tabIndex={0} role="region" aria-label={t("Leave-one-out test results", "Ergebnisse des Leave-one-out-Tests")} style={{ maxHeight: 380, overflowY: "auto" }}>
              <table>
                <thead><tr><th>{t("City", "Stadt")}</th><th className="num">{t("Real", "Echt")}</th><th className="num">{t("Estimated", "Geschätzt")}</th><th className="num">{t("Error", "Fehler")}</th></tr></thead>
                <tbody>{[...val].sort((a, b) => Math.abs(b.error_pct) - Math.abs(a.error_pct)).map((v) => (
                  <tr key={v.city}><td>{v.city}</td><td className="num">{f.eur(v.actual_asking_rent_eur_sqm)}</td><td className="num">{f.eur(v.estimated_asking_rent_eur_sqm)}</td><td className="num">{pct(v.error_pct, 1, true)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title={t("What each number means", "Was jede Zahl bedeutet")} />
          <div className="defs reveal">
            {METRICS[lang].map((m) => (
              <div key={m.k}>
                <h3>{m.k}</h3>
                <p>{m.plain}</p>
                <code>{m.formula}</code>{m.refs && <p className="def-refs">{t("Based on", "Grundlage:")} <Cite id={m.refs} /></p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section band" id="references" style={{ scrollMarginTop: 72 }}>
        <div className="wrap">
          <Head title={t("References", "Quellenverzeichnis")}>
            {t(<>Every explanation on this site that goes beyond our own numbers links to one of these publications. The numbers in square
              brackets, such as <Cite id="lebuhn2017" />, point here. The datasets themselves are listed under Sources below.</>,
              <>Jede Erklärung auf dieser Seite, die über unsere eigenen Zahlen hinausgeht, verweist auf eine dieser Publikationen. Die Zahlen in eckigen
              Klammern, etwa <Cite id="lebuhn2017" />, führen hierher. Die Datensätze selbst stehen unten unter Datenquellen.</>)}
          </Head>
          <ol className="refs reveal">
            {REFERENCES.map((r) => (
              <li key={r.id} id={`ref-${r.id}`}>
                <p className="ref-cite">
                  {r.authors} ({r.year}). <a href={r.url} target="_blank" rel="noopener noreferrer"><cite>{r.title}</cite></a>. {r.venue}.
                </p>
                <p className="ref-use"><b>{t("Used for:", "Verwendet für:")}</b> {de ? r.supports_de : r.supports}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="reveal" id="about">
            <h2>{t("About", "Über das Projekt")}</h2>
            <p className="prose" style={{ marginTop: 14 }}>
              {t(<>ImmoDash is an independent portfolio project by Zoeb Ali Khan: a full data platform from raw government files to tested models,
                an API and this website, maintained automatically. It is not affiliated with any of the data providers.</>,
                <>ImmoDash ist ein unabhängiges Portfolio-Projekt von Zoeb Ali Khan: eine vollständige Datenplattform von amtlichen Rohdateien über getestete Modelle
                bis zu einer API und dieser Website, automatisch gepflegt. Es ist mit keinem der Datenanbieter verbunden.</>)}
            </p>
            <ul className="list" style={{ margin: "18px 0 24px" }}>
              {(de ? [
                ["Data Engineering", "Medallion-Warehouse mit dbt, DuckDB und PostgreSQL, Orchestrierung mit Prefect"],
                ["Geo-Analytik", "über 380.000 Zensus-Gitterzellen, allen 400 Kreisen zugeordnet"],
                ["Machine Learning", "LightGBM-Quantilsprognosen, konforme Kalibrierung, Anomalieerkennung"],
                ["Angewandte KI", "LLM-Zusammenfassungen mit automatischem Faktenabgleich"],
                ["Produkt", "FastAPI, Next.js, Plotly Dash, CI/CD mit GitHub Actions"],
              ] : [
                ["Data engineering", "medallion warehouse with dbt, DuckDB and PostgreSQL, Prefect orchestration"],
                ["Geo analytics", "380,000+ census grid cells mapped to all 400 districts"],
                ["Machine learning", "LightGBM quantile forecasts, conformal calibration, anomaly detection"],
                ["Applied AI", "grounded LLM summaries with automatic fact checking"],
                ["Product", "FastAPI, Next.js, Plotly Dash, CI/CD with GitHub Actions"],
              ]).map(([k, v]) => <li key={k}><b style={strong}>{k}:</b> {v}</li>)}
            </ul>
            <div className="hero-cta" style={{ marginTop: 0 }}>
              <a className="btn" href="https://github.com/zoeb-ali/immodash">{t("View the source", "Zum Quellcode")}</a>
              <a className="textlink" href="https://zoeb-ali.github.io">Portfolio</a>
            </div>
          </div>
          <div className="reveal" id="sources" style={{ scrollMarginTop: 96 }}>
            <h2>{t("Sources", "Datenquellen")}</h2>
            <div className="tablewrap" style={{ marginTop: 18 }}>
              <table>
                <thead><tr><th>{t("Dataset", "Datensatz")}</th><th>{t("Data through", "Daten bis")}</th><th>{t("Licence", "Lizenz")}</th></tr></thead>
                <tbody>{sources.map((src) => { const fr = freshFor(src.key); return (
                  <tr key={src.key}>
                    <td className="cellwrap">{src.url ? <a href={src.url}>{src.publisher}</a> : src.publisher}</td>
                    <td className="cellwrap">{fr ? <>{f.monthLong(fr.data_through)}{fr.is_late && <span className="muted"> ({t("later than usual", "später als üblich")})</span>}</> : f.NA}</td>
                    <td className="cellwrap">{src.licence_url ? <a href={src.licence_url}>{src.licence}</a> : src.licence}</td>
                  </tr>); })}</tbody>
              </table>
            </div>
            <p className="note" style={{ marginTop: 10 }}>{t(
              "All data were modified by ImmoDash: cleaned, joined to districts, aggregated and modelled. The derived postcode table is a database derived from OpenStreetMap and is shared under the ODbL 1.0, like its source. \"Data through\" is the newest period each source contains, checked on every weekly run.",
              "Alle Daten wurden von ImmoDash verändert: bereinigt, Kreisen zugeordnet, aggregiert und modelliert. Die abgeleitete Postleitzahl-Tabelle ist eine aus OpenStreetMap abgeleitete Datenbank und steht wie ihre Quelle unter der ODbL 1.0. „Daten bis“ ist der neueste Zeitraum, den jede Quelle enthält, bei jedem wöchentlichen Lauf geprüft.")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
