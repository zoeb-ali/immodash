"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { basePath, href, langOf, type Lang } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";

const LINKS: { href: string; en: string; de: string }[] = [
  { href: "/", en: "The story", de: "Überblick" },
  { href: "/cities", en: "Cities", de: "Städte" },
  { href: "/affordability", en: "Can I afford it?", de: "Bezahlbarkeit" },
  { href: "/map", en: "Map", de: "Karte" },
  { href: "/supply-demand", en: "Supply & demand", de: "Angebot & Nachfrage" },
  { href: "/methodology", en: "How it works", de: "So funktioniert's" },
  { href: "/about", en: "About", de: "Über" },
];

/** EN | DE switch: links to the same page in the other language and remembers the choice. */
function LangToggle({ path }: { path: string }) {
  const lang = langOf(path), base = basePath(path);
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [path]);
  const remember = (l: Lang) => { try { localStorage.setItem("immodash-lang", l); } catch {} };
  return (
    <div className="lang-toggle" role="group" aria-label={lang === "de" ? "Sprache" : "Language"}>
      {(["en", "de"] as Lang[]).map((l) => (
        <Link key={l} href={href(l, base) + hash} hrefLang={l} lang={l} aria-current={l === lang ? "true" : undefined}
          aria-label={l === "en" ? "English" : "Deutsch"} onClick={() => remember(l)} scroll={false}>
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

export function Nav() {
  const path = usePathname() ?? "/";
  const lang = langOf(path), base = basePath(path);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className="topbar">
      <div className="topbar-inner" style={{ position: "relative" }}>
        <Link href={href(lang, "/")} className="brand" aria-label={lang === "de" ? "ImmoDash Startseite" : "ImmoDash home"}>
          <span className="brand-mark" aria-hidden><span /></span><b>ImmoDash</b>
        </Link>
        <button className="icon-btn menu-btn" aria-label={lang === "de" ? "Menü" : "Menu"} aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={18} weight="bold" aria-hidden /> : <List size={18} weight="bold" aria-hidden />}
        </button>
        <nav className="nav" id="mainnav" aria-label={lang === "de" ? "Hauptnavigation" : "Main"} data-open={open}>
          {LINKS.map((l) => {
            const active = l.href === "/" ? base === "/" : base.startsWith(l.href);
            return (
              <Link key={l.href} href={href(lang, l.href)} aria-current={active ? "page" : undefined}>
                {lang === "de" ? l.de : l.en}
              </Link>
            );
          })}
        </nav>
        <LangToggle path={path} />
        <ThemeToggle />
      </div>
    </header>
  );
}
