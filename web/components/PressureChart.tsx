"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/useLang";
import type { PressurePoint } from "@/lib/types";

export function PressureChart({ data }: { data: PressurePoint[] }) {
  const { t, f } = useI18n();
  const { month } = f;
  const rows = data.slice(-16).map((r) => ({ date: r.period_date, tom: r.time_on_market_days_4q,
    quick: r.share_closed_within_week_4q == null ? null : 100 * r.share_closed_within_week_4q }));
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => month(d)} stroke="var(--muted)" tick={{ fontSize: 12 }} minTickGap={30} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} tickFormatter={(v) => t(`${v} d`, `${v} T.`)} width={44} domain={[0, "auto"]} axisLine={false} tickLine={false} />
          <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
            <div className="tooltip"><div style={{ color: "var(--muted)" }}>{month(String(label))}</div>
              <div><b>{Number(payload[0].value).toFixed(0)} {t("days", "Tage")}</b> {t("on market", "online")}</div>
              <div>{f.pct(Number((payload[0].payload as { quick: number }).quick), 0)} {t("let within a week", "innerhalb einer Woche vermietet")}</div></div>) : null} />
          <Line dataKey="tom" stroke="var(--s2)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
