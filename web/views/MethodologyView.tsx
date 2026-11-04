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
    { n: "2", t: "Clean and test", d: "Tables are joined to Germany's 400 districts and checked automatically: no gaps, no impossible values.", tech: "dbt on DuckDB / PostgreSQL, 75 data tests" },
    { n: "3", t: "Model", d: "A forecasting model predicts each city's rent 3, 6 and 12 months ahead, and unusual months are flagged.", tech: "LightGBM quantile regression, conformal intervals, robust z-scores" },
    { n: "4", t: "Serve", d: "Every number on this site comes from one typed interface, so the website and analyst tools never disagree.", tech: "FastAPI, 25 endpoints, Pydantic contracts" },
    { n: "5", t: "Explain", d: "An AI model writes each city summary from a fixed list of facts. If it uses a number that is not in the list, the text is thrown away.", tech: "Groq LLM + numeric grounding check" },
    { n: "6", t: "Publish", d: "Every Monday the whole chain reruns and this site is rebuilt from the fresh data.", tech: "GitHub Actions, Next.js static export on Vercel" },
  ],
  de: [
    { n: "1", t: "Sammeln", d: "Elf offene Datensätze: Zensus 2022, GREIX-Inserate, Bauzinsen der Bundesbank, regionale Einkommen, Kreis- und Postleitzahlgrenzen.", tech: "Python-Ingestion, Rohdateien unverändert gespeichert (Bronze)" },
    { n: "2", t: "Bereinigen und testen", d: "Die Tabellen werden den 400 Kreisen Deutschlands zugeordnet und automatisch geprüft: keine Lücken, keine unmöglichen Werte.", tech: "dbt auf DuckDB / PostgreSQL, 75 Datentests" },
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
    { k: "New-lease premium", plain: "How much more someone signing a lease today pays than the average existing tenant paid in 2022.", formula: "Asking rent ÷ Zensus 2022 average contract rent − 1", refs: ["bbsr-rents"] },
    { k: "Rent burden", plain: "How much of a typical household's income the rent for a 60 m² flat would take.", formula: "Rent × 60 m² × 12 ÷ (2 × disposable income per resident)" },
    { k: "Affordability index", plain: "The rent burden compared with the typical German district: 100 is average, higher is more affordable.", formula: "Median district burden ÷ district burden × 100" },
    { k: "Estimated asking rent (districts)", plain: "For districts without listing data: the census rent raised by the gap between census and asking rents seen in nearby tracked cities.", formula: "Zensus rent × (1 + premium of the city, else state median, else national median)" },
    { k: "Rent range within a district", plain: "Rents differ from street to street. The range shows the cheaper and dearer ends of a district, leaving out the cheapest and dearest 10% of its area.", formula: "District estimate × (10th and 90th percentile ÷ median) of Zensus grid cells: 100 m in the 37 cities, 1 km elsewhere" },
    { k: "Postcode estimate", plain: "For the 37 cities: how a postcode compares with the rest of its city, applied to the city-wide estimate.", formula: "District estimate × median grid rent of the postcode's 100 m cells ÷ city median (postcode areas: OpenStreetMap)" },
    { k: "Supply-demand index", plain: "High when few flats are empty and the population is growing.", formula: "z(population growth 2018 to 2023) − z(empty and available flats, 2022); ≥ 1 tight, ≤ −1 slack", refs: ["bgb556d", "saxony2022"] },
    { k: "Live market pressure", plain: "How quickly flats are let in practice: days online and the share gone within a week.", formula: "Mean z-score of (inverted) days on market and share let within a week, per quarter" },
    { k: "Unusual month", plain: "A month where one city moved far more than the others, compared with its own last two years.", formula: "City change minus all-city median change; robust z vs. previous 24 months; |z| ≥ 3.5", refs: ["iglewicz1993"] },
  ],
  de: [
    { k: "Angebotsmiete", plain: "Der mittlere Preis pro m² der in einem Monat inserierten Mietwohnungen. Die Hälfte der Inserate kostet mehr, die Hälfte weniger.", formula: "Median der Inseratspreise, hedonischer GREIX-Index (bereinigt um Größe und Qualität)", refs: ["greix-rent", "eurostat2013"] },
    { k: "Neuvermietungsaufschlag", plain: "Wie viel mehr jemand zahlt, der heute einen Vertrag unterschreibt, als der durchschnittliche Bestandsmieter 2022.", formula: "Angebotsmiete ÷ durchschnittliche Vertragsmiete Zensus 2022 − 1", refs: ["bbsr-rents"] },
    { k: "Mietbelastung", plain: "Wie viel vom Einkommen eines typischen Haushalts die Miete für eine 60-m²-Wohnung nehmen würde.", formula: "Miete × 60 m² × 12 ÷ (2 × verfügbares Einkommen je Einwohner)" },
    { k: "Erschwinglichkeitsindex", plain: "Die Mietbelastung im Vergleich zum typischen deutschen Kreis: 100 ist Durchschnitt, höher ist bezahlbarer.", formula: "Median der Kreisbelastung ÷ Belastung des Kreises × 100" },
    { k: "Geschätzte Angebotsmiete (Kreise)", plain: "Für Kreise ohne Inseratsdaten: die Zensusmiete, erhöht um die Lücke zwischen Zensus- und Angebotsmieten in benachbarten erfassten Städten.", formula: "Zensusmiete × (1 + Aufschlag der Stadt, sonst Median des Landes, sonst bundesweiter Median)" },
    { k: "Mietspanne innerhalb eines Kreises", plain: "Mieten unterscheiden sich von Straße zu Straße. Die Spanne zeigt das günstigere und das teurere Ende eines Kreises, ohne die günstigsten und teuersten 10 % seiner Fläche.", formula: "Kreisschätzung × (10. und 90. Perzentil ÷ Median) der Zensus-Gitterzellen: 100 m in den 37 Städten, sonst 1 km" },
    { k: "Schätzung je Postleitzahl", plain: "Für die 37 Städte: wie eine Postleitzahl im Vergleich zum Rest ihrer Stadt liegt, angewendet auf die stadtweite Schätzung.", formula: "Kreisschätzung × mittlere Gittermiete der 100-m-Zellen der Postleitzahl ÷ Stadtmedian (PLZ-Gebiete: OpenStreetMap)" },
    { k: "Angebot-Nachfrage-Index", plain: "Hoch, wenn wenige Wohnungen leer stehen und die Bevölkerung wächst.", formula: "z(Bevölkerungswachstum 2018 bis 2023) − z(leere, verfügbare Wohnungen, 2022); ≥ 1 angespannt, ≤ −1 entspannt", refs: ["bgb556d", "saxony2022"] },
    { k: "Aktueller Marktdruck", plain: "Wie schnell Wohnungen in der Praxis vermietet werden: Tage online und Anteil, der innerhalb einer Woche weg ist.", formula: "Mittlerer z-Wert aus (invertierter) Vermarktungsdauer und Anteil innerhalb einer Woche vermietet, je Quartal" },
    { k: "Auffälliger Monat", plain: "Ein Monat, in dem sich eine Stadt viel stärker bewegt hat als die anderen, verglichen mit ihren eigenen letzten zwei Jahren.", formula: "Veränderung der Stadt minus Median aller Städte; robuster z-Wert ggü. den 24 Vormonaten; |z| ≥ 3,5", refs: ["iglewicz1993"] },
  ],
};

const MODEL_NAMES: Record<Lang, Record<string, string>> = {
  en: { lightgbm: "ImmoDash model", drift_last_12m: "Trend continues", naive_no_change: "No change" },
  de: { lightgbm: "ImmoDash-Modell", drift_last_12m: "Trend setzt sich fort", naive_no_change: "Keine Veränderung" },
};

export function MethodologyView({ lang }: { lang: Lang }) {
  const f = fmt(lang), t = tx(lang), de = lang === "de";
  const { num, pct } = f;
  const sources = data.sources(), bt = data.backtest(), meta = data.meta();
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
          <Stat label={t("Checks", "Prüfungen")} value={75} unit={t("data tests", "Datentests")} say={t("Run before anything is published.", "Laufen, bevor etwas veröffentlicht wird.")} />
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
              Twelve starting points, all 37 cities.<Cite id="hyndman2021" /></>,
              <>Wir haben die Daten wiederholt an einem früheren Monat abgeschnitten, nur mit dem damals Bekannten trainiert und die Prognose mit dem verglichen,
              was dann passierte. Zwölf Startpunkte, alle 37 Städte.<Cite id="hyndman2021" /></>)}
          </Head>
          <div className="split">
            <div className="reveal">
              {lg12 && nv12 && tr12 && <div className="prose">{t(<><p>Over 12 months the model was off by <strong>{pct(lg12.mape_pct, 2)}</strong> on average. Assuming
                rents stay the same was off by {pct(nv12.mape_pct, 2)}, and extending last year&apos;s trend by {pct(tr12.mape_pct, 2)}.
                {better != null && <> That is about {better}% smaller errors than the no-change guess.</>}</p>
                <p>{num(lg12.coverage_80_pct)}% of real outcomes fell inside the model&apos;s 80% range, close to the 80% it promises.</p></>,
                <><p>Über 12 Monate lag das Modell im Schnitt um <strong>{pct(lg12.mape_pct, 2)}</strong> daneben. Die Annahme gleichbleibender
                Mieten lag um {pct(nv12.mape_pct, 2)} daneben, das Fortschreiben des Vorjahrestrends um {pct(tr12.mape_pct, 2)}.
                {better != null && <> Das sind etwa {better} % kleinere Fehler als bei der Annahme „keine Veränderung“.</>}</p>
                <p>{num(lg12.coverage_80_pct)} % der echten Ergebnisse lagen in der 80-%-Spanne des Modells, nah an den versprochenen 80 %.</p></>)}</div>}
              <Takeaway label={t("In short", "Kurz gesagt")}>
                {t(<>The model beats the obvious shortcuts at every horizon, and its ranges are honest. It only knows past rents, so it cannot foresee
                  new laws or a sudden building boom.</>,
                  <>Das Modell schlägt die naheliegenden Abkürzungen bei jedem Horizont, und seine Spannen sind ehrlich. Es kennt nur vergangene Mieten und
                  kann daher keine neuen Gesetze oder einen plötzlichen Bauboom vorhersehen.</>)}
              </Takeaway>
            </div>
            <Figure title={t("Average forecast error, lower is better", "Durchschnittlicher Prognosefehler, niedriger ist besser")}
              sub={t("Mean absolute percentage error, out of sample.", "Mittlerer absoluter prozentualer Fehler, außerhalb der Stichprobe.")}
              source={t("ImmoDash back-test.", "ImmoDash-Backtest.")} numbers={<table><thead><tr><th>{t("Horizon", "Horizont")}</th><th>{t("Model", "Modell")}</th><th className="num">{t("Error", "Fehler")}</th><th className="num">{t("80% range hit rate", "Trefferquote 80-%-Spanne")}</th></tr></thead>
                <tbody>{bt.map((b) => <tr key={b.horizon_months + b.model}><td>{b.horizon_months} {t("months", "Monate")}</td><td>{MODEL_NAMES[lang][b.model] ?? b.model}</td><td className="num">{pct(b.mape_pct, 2)}</td><td className="num">{b.coverage_80_pct != null ? pct(b.coverage_80_pct, 0) : f.NA}</td></tr>)}</tbody></table>}>
              <BacktestChart data={bt} />
            </Figure>
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
                <thead><tr><th>{t("Dataset", "Datensatz")}</th><th>{t("Licence", "Lizenz")}</th></tr></thead>
                <tbody>{sources.map((src) => <tr key={src.key}><td className="cellwrap">{src.url ? <a href={src.url}>{src.publisher}</a> : src.publisher}</td><td className="cellwrap">{src.licence}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
