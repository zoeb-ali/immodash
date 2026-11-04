"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Bezirk } from "@/lib/types";
import { useI18n } from "@/lib/useLang";

export function BezirkeChart({ data }: { data: Bezirk[] }) {
  const { t, f } = useI18n();
  const rows = [...data].sort((a, b) => b.rent_eur_sqm - a.rent_eur_sqm);
  return (
    <div style={{ height: 28 * rows.length + 40 }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 58, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="bezirk_name" width={170} tick={{ fontSize: 12, fill: "var(--ink-2)" }} stroke="var(--line)" />
          <Tooltip content={({ active, payload }) => active && payload?.length ? (
            <div className="tooltip"><b>{(payload[0].payload as Bezirk).bezirk_name}</b><br />
              {f.num((payload[0].payload as Bezirk).rent_eur_sqm, 2)} €/m² ({f.pct((payload[0].payload as Bezirk).vs_city_pct, 0, true)} {t("vs. city", "ggü. Stadt")})</div>) : null} />
          <Bar dataKey="rent_eur_sqm" radius={[0, 4, 4, 0]} isAnimationActive={false}
            label={{ position: "right", fontSize: 11, fill: "var(--ink-2)", formatter: (v: unknown) => `${f.num(Number(v), 2)} €` }}>
            {rows.map((r) => <Cell key={r.bezirk_code} fill={r.vs_city_pct >= 0 ? "var(--d-neg1)" : "var(--d-pos1)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
