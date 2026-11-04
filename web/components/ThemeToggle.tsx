"use client";

import { CircleHalf, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/useLang";

type Mode = "system" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { system: "dark", dark: "light", light: "system" };
const LABEL = {
  en: { system: "Theme follows your system", dark: "Dark theme", light: "Light theme", change: "Change theme" },
  de: { system: "Design folgt dem System", dark: "Dunkles Design", light: "Helles Design", change: "Design wechseln" },
};

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const L = LABEL[useLang()];
  useEffect(() => {
    const a = document.documentElement.getAttribute("data-theme");
    if (a === "light" || a === "dark") setMode(a);
  }, []);
  function cycle() {
    const m = NEXT[mode];
    setMode(m);
    try {
      if (m === "system") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.removeItem("immodash-theme");
      } else {
        document.documentElement.setAttribute("data-theme", m);
        localStorage.setItem("immodash-theme", m);
      }
    } catch {}
  }
  return (
    <button className="icon-btn" onClick={cycle} aria-label={`${L[mode]}. ${L.change}`} title={L[mode]}>
      {mode === "dark" ? <Moon size={17} weight="bold" aria-hidden /> : mode === "light" ? <Sun size={17} weight="bold" aria-hidden /> : <CircleHalf size={17} weight="bold" aria-hidden />}
    </button>
  );
}
