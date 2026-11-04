"use client";

// Site footer: structure follows the "open source project" footer pattern (brand + status, link columns,
// author, legal bar), built in the site's own design system rather than importing another UI kit.
import Link from "next/link";
import { ArrowUpRight, GithubLogo, Globe, LinkedinLogo } from "@phosphor-icons/react";
import { useI18n } from "@/lib/useLang";

const REPO = "https://github.com/zoeb-ali/immodash";

type Col = { title: [string, string]; links: { href: string; label: [string, string]; external?: boolean }[] };
const COLUMNS: Col[] = [
  { title: ["Explore", "Entdecken"], links: [
    { href: "/", label: ["The story", "Überblick"] }, { href: "/cities", label: ["City profiles", "Städteprofile"] },
    { href: "/affordability", label: ["Can I afford it?", "Kann ich mir das leisten?"] },
    { href: "/map", label: ["District map", "Kreiskarte"] }, { href: "/supply-demand", label: ["Supply & demand", "Angebot & Nachfrage"] },
  ] },
  { title: ["Project", "Projekt"], links: [
    { href: "/about", label: ["Why I built this", "Warum ich das gebaut habe"] }, { href: "/methodology", label: ["How it works", "So funktioniert's"] },
    { href: "/methodology#references", label: ["References", "Quellenverzeichnis"] }, { href: "/methodology#sources", label: ["Data sources", "Datenquellen"] },
    { href: REPO, label: ["Source code", "Quellcode"], external: true }, { href: `${REPO}/issues`, label: ["Report an issue", "Fehler melden"], external: true },
  ] },
  { title: ["Author", "Autor"], links: [
    { href: "https://zoeb-ali.github.io", label: ["Portfolio", "Portfolio"], external: true },
    { href: "https://linkedin.com/in/zoeb-ali-khan", label: ["LinkedIn", "LinkedIn"], external: true },
    { href: "https://github.com/zoeb-ali", label: ["GitHub", "GitHub"], external: true },
  ] },
];

export function Footer({ latestMonth, generatedAt }: { latestMonth: string; generatedAt: string }) {
  const { lang, t, f, to } = useI18n();
  const i = lang === "de" ? 1 : 0;
  const year = new Date(generatedAt).getUTCFullYear();
  return (
    <footer className="foot">
      <div className="foot-main">
        <div className="foot-brand">
          <Link href={to("/")} className="brand" aria-label={t("ImmoDash home", "ImmoDash Startseite")}><span className="brand-mark" aria-hidden><span /></span><b>ImmoDash</b></Link>
          <p className="foot-tag">{t(
            "German rents, explained with open data. An independent data project by Zoeb Ali Khan, M.Sc. Data Science student at Universität Bielefeld.",
            "Mieten in Deutschland, erklärt mit offenen Daten. Ein unabhängiges Datenprojekt von Zoeb Ali Khan, Student im M.Sc. Data Science an der Universität Bielefeld.")}</p>
          <p className="foot-status">
            <span className="live-dot" aria-hidden />
            <span>{t(<>Data up to {f.monthLong(latestMonth)}. Last automatic refresh {f.day(generatedAt)}.</>,
              <>Daten bis {f.monthLong(latestMonth)}. Zuletzt automatisch aktualisiert am {f.day(generatedAt)}.</>)}</span>
          </p>
          <div className="foot-social">
            <a className="icon-btn" href={REPO} aria-label={t("ImmoDash source code on GitHub", "Quellcode von ImmoDash auf GitHub")}><GithubLogo size={18} weight="bold" aria-hidden /></a>
            <a className="icon-btn" href="https://linkedin.com/in/zoeb-ali-khan" aria-label={t("Zoeb Ali Khan on LinkedIn", "Zoeb Ali Khan auf LinkedIn")}><LinkedinLogo size={18} weight="bold" aria-hidden /></a>
            <a className="icon-btn" href="https://zoeb-ali.github.io" aria-label={t("Zoeb Ali Khan portfolio", "Portfolio von Zoeb Ali Khan")}><Globe size={18} weight="bold" aria-hidden /></a>
          </div>
        </div>
        <nav className="foot-cols" aria-label={t("Footer", "Fußzeile")}>
          {COLUMNS.map((c) => (
            <div key={c.title[0]}>
              <h2 className="foot-h">{c.title[i]}</h2>
              <ul>
                {c.links.map((l) => (
                  <li key={l.href + l.label[0]}>
                    {l.external
                      ? <a href={l.href}>{l.label[i]}<ArrowUpRight size={12} weight="bold" aria-hidden className="ext" /></a>
                      : <Link href={to(l.href)}>{l.label[i]}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="foot-legal">
        <p>&copy; {year} Zoeb Ali Khan. {t(
          "A student portfolio project, not affiliated with the data providers. Estimates, not financial advice.",
          "Ein studentisches Portfolio-Projekt, unabhängig von den Datenanbietern. Schätzungen, keine Finanzberatung.")}</p>
        <p>
          {t("Data", "Daten")}: Zensus 2022 {t("and", "und")} VGR der Länder (Statistische Ämter des Bundes und der Länder, dl-de/by-2-0); GREIX Mietpreisindex (Kiel Institut
          für Weltwirtschaft); Deutsche Bundesbank; &copy; GeoBasis-DE / BKG; {t("postcode areas and basemap", "Postleitzahlgebiete und Grundkarte")} &copy; {t("OpenStreetMap contributors", "OpenStreetMap-Mitwirkende")} (ODbL).{" "}
          {t("Asking rents outside the 37 GREIX cities are model estimates.", "Angebotsmieten außerhalb der 37 GREIX-Städte sind Modellschätzungen.")}
        </p>
      </div>
    </footer>
  );
}
