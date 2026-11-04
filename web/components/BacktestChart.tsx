"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Backtest } from "@/lib/types";
import { useI18n } from "@/lib/useLang";

const MODELS_ALL = {
  en: [
    { key: "lightgbm", label: "ImmoDash model (LightGBM)", fill: "var(--s1)" },
    { key: "drift_last_12m", label: "Assume last year's trend continues", fill: "var(--s2)" },
    { key: "naive_no_change", label: "Assume no change", fill: "var(--context)" },
  ],
  de: [
    { key: "lightgbm", label: "ImmoDash-Modell (LightGBM)", fill: "var(--s1)" },
    { key: "drift_last_12m", label: "Vorjahrestrend setzt sich fort", fill: "var(--s2)" },
    { key: "naive_no_change", label: "Keine Veränderung", fill: "var(--context)" },
  ],
};

export function BacktestChart({ data }: { data: Backtest[] }) {
  const { lang, t, f } = useI18n();
  const MODELS = MODELS_ALL[lang];
  const rows = [3, 6, 12].map((h) => Object.fromEntries([["h", t(`${h} months`, `${h} Monate`)],
    ...MODELS.map((m) => [m.key, data.find((d) => d.horizon_months === h && d.model === m.key)?.mape_pct ?? null])]));
  return (
    <div>
    <div className="legend" style={{ marginBottom: 8 }}>
      {MODELS.map((m) => <span key={m.key} className="key"><span className="sw" style={{ background: m.fill }} />{m.label}</span>)}
    </div>
    <div style={{ height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barGap={3}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="h" stroke="var(--muted)" tick={{ fontSize: 12 }} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} tickFormatter={(v) => f.pct(v, 0)} width={40} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload, label }) => active && payload?.length ? (
            <div className="tooltip"><div style={{ color: "var(--muted)" }}>{label}</div>{payload.map((p) => (
              <div key={String(p.dataKey)}>{MODELS.find((m) => m.key === p.dataKey)?.label}: <b>{f.pct(Number(p.value), 2)}</b></div>))}</div>) : null} />
          {MODELS.map((m) => <Bar key={m.key} dataKey={m.key} fill={m.fill} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
    </div>
  );
}
