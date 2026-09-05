import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface EvolutionPoint {
  date: string;
  google: number;
  meta: number;
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  const points = useMemo(() => data, [data]);

  return (
    <div className="h-full w-full min-w-0" style={{ minHeight: "clamp(200px, 45vw, 260px)" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lots-google" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--secondary-500)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--secondary-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lots-meta" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-500)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDay}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => (v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`)}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            cursor={{ stroke: "var(--primary-400)", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "12px",
              boxShadow: "var(--shadow-md)",
            }}
            labelFormatter={(v) => fmtDay(v as string)}
            formatter={(value: number, name) => [
              fmtBRL(value),
              name === "google" ? "Google Ads" : "Meta Ads",
            ]}
          />
          <Area
            type="monotone"
            dataKey="google"
            stroke="var(--secondary-600)"
            strokeWidth={2}
            fill="url(#lots-google)"
          />
          <Area
            type="monotone"
            dataKey="meta"
            stroke="var(--primary-500)"
            strokeWidth={2}
            fill="url(#lots-meta)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
