"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Series {
  key: string;
  label: string;
  color: string;
  stackId?: string;
}

const axisProps = {
  tick: { fill: "#64748b", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export function TrendChart({
  data,
  xKey,
  series,
  type = "bar",
  height = 260,
  valueFormatter = (v: number) => v.toLocaleString("en-IN"),
  ariaLabel,
}: {
  data: object[];
  xKey: string;
  series: Series[];
  type?: "bar" | "area";
  height?: number;
  valueFormatter?: (value: number) => string;
  ariaLabel: string;
}) {
  const tooltip = (
    <Tooltip
      cursor={{ fill: "rgba(88,124,152,0.08)" }}
      contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(23,53,80,0.08)" }}
      formatter={(value) => valueFormatter(Number(value))}
    />
  );
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="#eef2f6" />
      <XAxis dataKey={xKey} {...axisProps} minTickGap={16} />
      <YAxis {...axisProps} width={56} tickFormatter={(v: number) => valueFormatter(v)} />
      {tooltip}
      {series.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} /> : null}
    </>
  );
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {common}
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#fill-${s.key})`} />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {common}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={s.stackId} radius={s.stackId ? 0 : [4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export const CHART_COLORS = {
  primary: "#23496d",
  slate: "#587c98",
  gold: "#b8975a",
  success: "#15803d",
  warning: "#d97706",
  danger: "#b91c1c",
  light: "#a9bfd1",
};
