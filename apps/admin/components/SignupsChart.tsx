"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: { month: string; count: number }[];
};

export function SignupsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand-sage)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-brand-sage)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          stroke="rgba(0,0,0,0.2)"
          tick={{ fill: "rgba(0,0,0,0.5)", fontSize: 12 }}
        />
        <YAxis
          stroke="rgba(0,0,0,0.2)"
          tick={{ fill: "rgba(0,0,0,0.5)", fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: "4px",
            color: "#40304F",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-brand-sage)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorSignups)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
