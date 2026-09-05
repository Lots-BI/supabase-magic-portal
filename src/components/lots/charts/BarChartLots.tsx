// Lots BI · BarChartLots
// Barras horizontais — usado em "Top clientes" e distribuição por plataforma.
// Sem Recharts: HTML/CSS puro para alinhar 100% ao Design System (sem ruído
// visual de eixos e ticks que não combinam com a estética Lots BI).
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { type CommonMetric, formatMetric } from "@/lib/metrics";

export interface BarRow {
  key: string;
  label: ReactNode;
  /** Valor numérico bruto, formatado conforme `metric`. */
  value: number;
  /** Métrica canônica — controla formatação do label de valor. */
  metric: CommonMetric;
  /** Trailing slot (ex.: % share, secondary KPI). */
  trailing?: ReactNode;
  /** Tone da barra. */
  tone?: "primary" | "secondary" | "neutral";
}

interface Props {
  rows: BarRow[];
  /** Limite explícito do eixo (caso queira escala compartilhada). */
  max?: number;
  className?: string;
  empty?: ReactNode;
}

export function BarChartLots({ rows, max, className, empty }: Props) {
  if (rows.length === 0) {
    return (
      <div className={cn("py-10 text-center text-sm text-muted-foreground", className)}>
        {empty ?? "Sem dados para o período."}
      </div>
    );
  }
  const cap = max ?? rows.reduce((m, r) => Math.max(m, r.value), 0);
  return (
    <ul className={cn("space-y-2.5", className)}>
      {rows.map((r) => {
        const pct = cap > 0 ? Math.max(2, (r.value / cap) * 100) : 0;
        const tone = r.tone ?? "primary";
        return (
          <li key={r.key} className="group">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 text-[12.5px] font-medium text-foreground">
                {r.label}
              </div>
              <div className="flex shrink-0 items-baseline gap-3 text-[12px] tabular-nums">
                <span className="font-display font-semibold text-foreground">
                  {formatMetric(r.metric, r.value)}
                </span>
                {r.trailing && (
                  <span className="text-[11px] text-muted-foreground">{r.trailing}</span>
                )}
              </div>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  tone === "primary" && "bg-gradient-to-r from-primary-400 to-primary-600",
                  tone === "secondary" && "bg-gradient-to-r from-secondary-400 to-secondary-600",
                  tone === "neutral" && "bg-muted-foreground/50",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
