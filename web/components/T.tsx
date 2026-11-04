"use client";

import type { ReactNode } from "react";
import { useLang } from "@/lib/useLang";

/** Short UI text in both languages, for server components that do not know the page language (shared layout parts). */
export function T({ en, de }: { en: ReactNode; de: ReactNode }) {
  return <>{useLang() === "de" ? de : en}</>;
}
