"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useI18n } from "@/lib/useLang";

export function HeroMapLink() {
  const { t, to } = useI18n();
  return <Link href={to("/map")} className="textlink" style={{ fontSize: 14 }}>{t("Explore the map", "Zur Karte")} <ArrowRight size={14} weight="bold" aria-hidden /></Link>;
}
