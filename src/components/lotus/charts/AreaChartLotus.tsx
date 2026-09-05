// Lotus · AreaChartLotus
// Chart de evolução temporal com gradientes Lotus, eixos sutis, tooltip glass.
// Toda formatação passa pela camada de normalização (src/lib/metrics.ts).
import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { type CommonMetric, formatCompact, formatDayLong, formatMetric } from "@/lib/metrics";

export type AreaSeriesTone = "primary" | "secondary" | "success" | "neutral";

export interface AreaSeries {
  /** Chave do dado em cada ponto. */
  key: string;
  /** Rótulo amigável (tooltip + legenda). */
  label: string;
  /** Métrica canônica — controla formatação. */
  metric: CommonMetric;
  tone: AreaSeriesTone;
}

const TONE: Record<AreaSeriesTone, { stroke: string; fillFrom: string; legend: string }> = {
  primary: { stroke: "var(--primary-500)", fillFrom: "var(--primary-500)", legend: "#A855F7" },
  secondary: {
    stroke: "var(--secondary-600)",
    fillFrom: "var(--secondary-500)",
    legend: "#60A5FA",
  },
  success: { stroke: "var(--success)", fillFrom: "var(--success)", legend: "#22c55e" },
  neutral: {
    stroke: "var(--muted-foreground)",
    fillFrom: "var(--muted-foreground)",
    legend: "#a1a1aa",
  },
};

interface Props {
  // Aceita qualquer shape de ponto desde que tenha `date`. Os charts usam
  // apenas `series[].key` para extrair valores, então tipar como any[] aqui
  // permite passar DailyPoint, etc., sem cast manual em cada call site.
  data: any[];
  series: AreaSeries[];
  height?: number;
  className?: string;
  /** Métrica usada para formatar o eixo Y (default = primeira série). */
  yMetric?: CommonMetric;
}

export function AreaChartLotus({ data, series, height = 260, className, yMetric }: Props) {
  const uid = useId().replace(/:/g, "");
  const points = useMemo(() => data, [data]);
  const yFmtMetric = yMetric ?? series[0]?.metric ?? "spend";

  return (
    <div
      className={cn("relative w-full min-w-0 overflow-hidden", className)}
      style={{ height: `clamp(176px, 38vw, ${height}px)` }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => {
              const c = TONE[s.tone];
              return (
                <linearGradient
                  id={`lotus-area-${uid}-${s.key}`}
                  key={s.key}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={c.fillFrom} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={c.fillFrom} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => {
              const d = new Date((v as string) + "T00:00:00");
              return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
            }}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => formatCompact(yFmtMetric, v as number)}
            tickLine={false}
            axisLine={false}
            width={54}
          />
          <Tooltip
            cursor={{ stroke: "var(--primary-400)", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              padding: "10px 12px",
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{
              color: "var(--muted-foreground)",
              fontSize: "11px",
              marginBottom: "4px",
            }}
            labelFormatter={(v) => formatDayLong(v as string)}
            formatter={(value: number, _name, item) => {
              const k = (item?.dataKey as string) ?? "";
              const s = series.find((x) => x.key === k);
              if (!s) return [formatMetric("spend", value), k];
              return [formatMetric(s.metric, value), s.label];
            }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={TONE[s.tone].stroke}
              strokeWidth={2}
              fill={`url(#lotus-area-${uid}-${s.key})`}
              activeDot={{ r: 3.5, strokeWidth: 0, fill: TONE[s.tone].stroke }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
