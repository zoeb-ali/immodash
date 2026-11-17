"use client";

import { useState } from "react";
import { HERO_H, HERO_W } from "@/lib/heroDims";
import { useI18n } from "@/lib/useLang";

/** Hero map (FE-2). First paint is a plain image per theme (no 400 inline paths in the page). When someone points
 *  at the map, the same paths are fetched once and inlined, and one delegated handler shows the tooltip. */
export function HeroMapHover({ rents, names, alt }: { rents: Record<string, number>; names: Record<string, string>; alt: string }) {
  const { t, f } = useI18n();
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activate = () => {
    if (svg || loading) return;
    setLoading(true);
    fetch("/hero-map-paths.svg").then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((text) => setSvg(text.replace("<svg ", `<svg role="img" aria-label="${alt.replace(/"/g, "&quot;")}" style="width:100%;display:block" `)))
      .catch(() => setLoading(false));
  };
  return (
    <div className="mapwrap" onMouseLeave={() => setHover(null)} onPointerEnter={activate} onFocus={activate}
      style={{ maxWidth: "min(100%, 680px, calc((100svh - 230px) * 0.737))", minWidth: "min(100%, 300px)", marginInline: "auto" }}
      onMouseMove={(e) => {
        const ags = (e.target as Element).getAttribute?.("data-ags");
        if (!ags) { setHover(null); return; }
        const r = e.currentTarget.getBoundingClientRect();
        setHover({ ags, x: e.clientX - r.left, y: e.clientY - r.top });
      }}>
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : (
        <>
          <img className="hero-img hero-img-light" src="/hero-map-light.svg" width={HERO_W} height={HERO_H} alt={alt} fetchPriority="high" />
          <img className="hero-img hero-img-dark" src="/hero-map-dark.svg" width={HERO_W} height={HERO_H} alt="" aria-hidden />
        </>
      )}
      {hover && rents[hover.ags] != null && (
        <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 12, 260), top: hover.y + 12, pointerEvents: "none" }}>
          <b>{names[hover.ags]?.split(",")[0]}</b><br />{t("about", "etwa")} {f.num(rents[hover.ags], 2)} € {t("per m²", "pro m²")}
        </div>
      )}
    </div>
  );
}
