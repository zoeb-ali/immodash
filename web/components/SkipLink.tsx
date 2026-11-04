"use client";

import { useLang } from "@/lib/useLang";

export function SkipLink() {
  return <a className="skip" href="#content">{useLang() === "de" ? "Zum Inhalt springen" : "Skip to content"}</a>;
}
