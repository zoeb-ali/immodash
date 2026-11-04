"use client";

import { REF_INDEX, refById } from "@/lib/references";
import { useI18n } from "@/lib/useLang";

/** Numbered citation: [n] links to the full reference on the methodology page (in the page's language). */
export function Cite({ id }: { id: string | string[] }) {
  const { t, to } = useI18n();
  const ids = Array.isArray(id) ? id : [id];
  return (
    <sup className="cite">
      {ids.map((k) => {
        const r = refById(k);
        if (!r) throw new Error(`Unknown reference ${k}`);
        return (
          <a key={k} href={to(`/methodology#ref-${k}`)} title={`${r.authors} (${r.year}). ${r.title}`} aria-label={`${t("Reference", "Quelle")} ${REF_INDEX[k]}: ${r.authors}, ${r.year}`}>
            [{REF_INDEX[k]}]
          </a>
        );
      })}
    </sup>
  );
}
