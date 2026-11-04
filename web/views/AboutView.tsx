import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Cite } from "@/components/Cite";
import { Head, PageHero, Stat, Takeaway } from "@/components/ui";
import { href, tx, type Lang } from "@/lib/i18n";

export function AboutView({ lang }: { lang: Lang }) {
  const t = tx(lang), de = lang === "de", to = (p: string) => href(lang, p);
  const arrow = <ArrowRight size={14} weight="bold" aria-hidden />;
  const steps = de ? [
    { n: "01", h: "Ist diese Miete normal?", p: "Einen Neuvertrag mit dem vergleichen, was andere schon zahlen, und mit dem Trend in 37 Städten.", href: "/", l: "Überblick" },
    { n: "02", h: "Kann ich mir das leisten?", p: "Eine Wohnung an der 30-Prozent-Regel messen oder jeden Kreis finden, in dem ein Budget reicht.", href: "/affordability", l: "Bezahlbarkeit" },
    { n: "03", h: "Wo ist es am schwersten?", p: "Sehen, wo kaum Wohnungen leer stehen, während die Bevölkerung wächst, in allen 400 Kreisen.", href: "/supply-demand", l: "Angebot & Nachfrage" },
    { n: "04", h: "Kann ich dem trauen?", p: "Jede Zahl stammt aus amtlichen oder wissenschaftlichen Daten, und jede Erklärung verweist auf eine veröffentlichte Quelle.", href: "/methodology", l: "So funktioniert's" },
  ] : [
    { n: "01", h: "Is this rent normal?", p: "Compare a new lease with what people already pay and with the trend in 37 cities.", href: "/", l: "The story" },
    { n: "02", h: "Can I afford it?", p: "Check a flat against the 30% rule, or find every district where a budget works.", href: "/affordability", l: "Affordability" },
    { n: "03", h: "Where is it hardest?", p: "See where few flats stand empty while the population grows, in all 400 districts.", href: "/supply-demand", l: "Supply & demand" },
    { n: "04", h: "Can I trust it?", p: "Every number comes from official or academic data, and every explanation links to a published source.", href: "/methodology", l: "How it works" },
  ];
  return (
    <>
      <PageHero full de={de} title={t("Why I built ImmoDash", "Warum ich ImmoDash gebaut habe")}
        lead={t("I grew up in Mumbai, one of the most crowded cities in the world. Moving to Germany taught me that the same question follows people on small incomes everywhere: how much of what I earn will the roof take?",
          "Ich bin in Mumbai aufgewachsen, einer der am dichtesten besiedelten Städte der Welt. Der Umzug nach Deutschland hat mir gezeigt, dass Menschen mit kleinem Einkommen überall dieselbe Frage begleitet: Wie viel von dem, was ich verdiene, frisst das Dach über dem Kopf?")}
        label={t("The numbers behind this story", "Die Zahlen hinter dieser Geschichte")}
        facts={<>
          <Stat label="Mumbai" value="~20" unit={t("million people", "Mio. Menschen")} say={<>{t("One of the largest cities on earth.", "Eine der größten Städte der Welt.")}<Cite id="unwup2018" /></>} />
          <Stat label={t("Living in slums", "Leben in Slums")} value={t("41.8%", "41,8 %")} unit="Greater Mumbai" say={<>{t("About 5.2 million people, Census 2011.", "Etwa 5,2 Millionen Menschen, Zensus 2011.")}<Cite id="bhagat2016" /></>} />
          <Stat label={t("Germany, people at risk of poverty", "Deutschland, armutsgefährdete Menschen")} value={t("43.7%", "43,7 %")} unit={t("of income", "des Einkommens")}
            say={<>{t("Goes on housing, against 24.1% on average (2025).", "Gehen fürs Wohnen drauf, gegenüber 24,1 % im Schnitt (2025).")}<Cite id="destatis-share" /></>} />
          <Stat label={t("Overburdened", "Überlastet")} value={t("35.0%", "35,0 %")} unit={t("of them", "von ihnen")}
            say={<>{t("Spend more than 40% of their income on housing, against 11.2% of everyone.", "Geben mehr als 40 % ihres Einkommens fürs Wohnen aus, gegenüber 11,2 % aller Menschen.")}<Cite id="destatis-overburden" /></>} />
        </>} />

      <section className="section tight">
        <div className="wrap split wl about-split">
          <figure className="about-photo reveal">
            <picture>
              <source srcSet="/img/mumbai-sunset.webp" type="image/webp" />
              <img src="/img/mumbai-sunset.jpg" width={1600} height={1067} loading="eager"
                alt={t("Mumbai's skyline at sunset seen from the beach, with people walking on the wet sand in the foreground",
                  "Die Skyline von Mumbai bei Sonnenuntergang, vom Strand aus gesehen, im Vordergrund Menschen auf dem nassen Sand")} />
            </picture>
            <figcaption>
              {t("Mumbai at sunset, seen from the beach. Photo:", "Mumbai bei Sonnenuntergang, vom Strand aus gesehen. Foto:")}{" "}
              <a href="https://commons.wikimedia.org/wiki/File:Mumbai,_India,_Bombay,_Mumbai_skyline_at_sunset.jpg">Vyacheslav Argenberg</a>,{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, {t("via Wikimedia Commons.", "über Wikimedia Commons.")}
            </figcaption>
          </figure>
          <div className="prose reveal about-text">
            <h2>{t("Growing up in Mumbai", "Aufgewachsen in Mumbai")}</h2>
            {t(<>
              <p>Mumbai has close to 20 million inhabitants<Cite id="unwup2018" />. In the 2011 census, 41.8% of the people in Greater Mumbai, about
                5.2 million, lived in slums<Cite id="bhagat2016" />.</p>
              <p>Growing up there, I saw how housing shapes the lives of people on small incomes: where they can live, and how little is left at
                the end of the month once the roof is paid for. Housing is not one expense among many. For a low-income
                household it is the expense that decides the others.</p>
            </>, <>
              <p>Mumbai hat fast 20 Millionen Einwohner<Cite id="unwup2018" />. Beim Zensus 2011 lebten 41,8 % der Menschen in Greater Mumbai, etwa
                5,2 Millionen, in Slums<Cite id="bhagat2016" />.</p>
              <p>Dort aufzuwachsen hat mir gezeigt, wie das Wohnen das Leben von Menschen mit kleinem Einkommen prägt: wo sie leben können und wie wenig
                am Monatsende übrig bleibt, wenn das Dach bezahlt ist. Wohnen ist nicht eine Ausgabe unter vielen. Für einen Haushalt mit
                geringem Einkommen ist es die Ausgabe, die über alle anderen entscheidet.</p>
            </>)}
          </div>
        </div>
      </section>

      <section className="section band">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>{t("Then Germany", "Dann Deutschland")}</h2>
            <p className="prose" style={{ marginTop: 14 }}>
              {t("In November 2024 I moved to Bielefeld to study for an M.Sc. in Data Science, and went through the German flat search myself as a student.",
                "Im November 2024 bin ich für den M.Sc. Data Science nach Bielefeld gezogen und habe die deutsche Wohnungssuche als Student selbst erlebt.")}
            </p>
          </div>
          <div className="prose reveal">
            {t(<>
              <p>Germany is a far richer country, yet the pattern is familiar. On average, households spend 24.1% of their disposable income on
                housing. For people at risk of poverty it is 43.7%<Cite id="destatis-share" />. More than a third of them, 35.0%, spend over 40% of
                their income on housing, against 11.2% of the whole population<Cite id="destatis-overburden" />.</p>
              <p>In the cities it is sharper still. A study of Germany&apos;s 77 big cities found that almost 13% of tenant households have less than
                the subsistence minimum left after paying rent<Cite id="holm2021" />. And a rent above 30% of net income is generally seen as
                problematic, because too little remains for everything else<Cite id="lebuhn2017" />.</p>
            </>, <>
              <p>Deutschland ist ein viel reicheres Land, und doch ist das Muster vertraut. Im Schnitt geben Haushalte 24,1 % ihres verfügbaren Einkommens fürs
                Wohnen aus. Bei armutsgefährdeten Menschen sind es 43,7 %<Cite id="destatis-share" />. Mehr als ein Drittel von ihnen, 35,0 %, gibt über 40 %
                des Einkommens fürs Wohnen aus, gegenüber 11,2 % der Gesamtbevölkerung<Cite id="destatis-overburden" />.</p>
              <p>In den Städten ist es noch schärfer. Eine Studie zu den 77 deutschen Großstädten ergab, dass fast 13 % der Mieterhaushalte nach Zahlung der
                Miete weniger als das Existenzminimum bleibt<Cite id="holm2021" />. Und eine Miete über 30 % des Nettoeinkommens gilt allgemein als
                problematisch, weil zu wenig für alles andere bleibt<Cite id="lebuhn2017" />.</p>
            </>)}
            <Takeaway label={t("The common thread", "Der rote Faden")}>
              {t("Whether in Mumbai or in a German city, the lower your income, the larger the share that rent takes. That is the question ImmoDash is built to answer with real numbers.",
                "Ob in Mumbai oder in einer deutschen Stadt: Je niedriger das Einkommen, desto größer der Anteil, den die Miete nimmt. Genau diese Frage soll ImmoDash mit echten Zahlen beantworten.")}
            </Takeaway>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title={t("Why data, and why open data", "Warum Daten, und warum offene Daten")}>
            {t("Renters usually have one number to go on: the price in the listing. I wanted to put that number in context, using only sources anyone can check.",
              "Mieter haben meist nur eine Zahl als Anhaltspunkt: den Preis im Inserat. Ich wollte diese Zahl einordnen, und zwar nur mit Quellen, die jeder prüfen kann.")}
          </Head>
          <ol className="steps reveal about-steps">
            {steps.map((s) => (
              <li key={s.n}>
                <span className="n">{s.n}</span>
                <div><h3>{s.h}</h3><p>{s.p}</p></div>
                <Link className="textlink" href={to(s.href)}>{s.l} {arrow}</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section band tight">
        <div className="wrap split">
          <div className="reveal">
            <h2>{t("About me", "Über mich")}</h2>
          </div>
          <div className="prose reveal">
            <p>
              {t(<>I&apos;m Zoeb Ali Khan, currently pursuing an M.Sc. in Data Science at Universität Bielefeld. I built ImmoDash end to end: the data
                pipeline, the models, the API and this website. It is an independent project and not affiliated with any of the data providers.</>,
                <>Ich bin Zoeb Ali Khan und studiere derzeit Data Science (M.Sc.) an der Universität Bielefeld. ImmoDash habe ich von Anfang bis Ende selbst gebaut: die
                Datenpipeline, die Modelle, die API und diese Website. Es ist ein unabhängiges Projekt und mit keinem der Datenanbieter verbunden.</>)}
            </p>
            <div className="hero-cta" style={{ marginTop: 20 }}>
              <a className="btn" href="https://zoeb-ali.github.io">Portfolio</a>
              <a className="textlink" href="https://linkedin.com/in/zoeb-ali-khan">LinkedIn {arrow}</a>
              <a className="textlink" href="https://github.com/zoeb-ali/immodash">{t("Source code", "Quellcode")} {arrow}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
