// Lots BI · DonutChartLots
// Donut/pizza para distribuição (ex.: spend por plataforma).
// SVG nativo — sem importar o módulo de pie do Recharts (mais leve, melhor
// controle visual). Suporta até 6 fatias antes de agrupar em "outros".
import { cn } from "@/lib/utils";
import { type CommonMetric, formatMetric } from "@/lib/metrics";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  tone: "primary" | "secondary" | "accent" | "neutral";
}

const TONE_FILL: Record<DonutSlice["tone"], string> = {
  primary: "var(--primary-500)",
  secondary: "var(--secondary-500)",
  accent: "var(--primary-300)",
  neutral: "var(--muted-foreground)",
};

interface Props {
  slices: DonutSlice[];
  metric: CommonMetric;
  /** Diâmetro do donut em px. */
  size?: number;
  /** Espessura do anel em px. */
  thickness?: number;
  /** Texto centralizado (ex.: total). */
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function DonutChartLots({
  slices,
  metric,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
  className,
}: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const responsiveSize = `min(${size}px, 42vw)`;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6",
        className,
      )}
    >
      <div
        className="relative mx-auto shrink-0 sm:mx-0"
        style={{ width: responsiveSize, height: responsiveSize, maxWidth: size, maxHeight: size }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          className="max-h-full max-w-full"
        >
          {/* Trilho */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            slices.map((s) => {
              const frac = s.value / total;
              const dash = frac * c;
              const gap = c - dash;
              const offset = -acc * c;
              acc += frac;
              return (
                <circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={TONE_FILL[s.tone]}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  strokeLinecap="butt"
                />
              );
            })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel && (
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {centerLabel}
              </p>
            )}
            {centerValue && (
              <p className="font-display text-lg font-semibold tabular-nums text-foreground">
                {centerValue}
              </p>
            )}
          </div>
        )}
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2">
        {slices.length === 0 && (
          <li className="text-sm text-muted-foreground">Sem distribuição no período.</li>
        )}
        {slices.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <li
              key={s.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: TONE_FILL[s.tone] }}
                  aria-hidden
                />
                <span className="truncate text-[12.5px] font-medium text-foreground">
                  {s.label}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-[13px] font-semibold tabular-nums text-foreground">
                  {formatMetric(metric, s.value)}
                </div>
                <div className="text-[10.5px] tabular-nums text-muted-foreground">
                  {pct.toFixed(1)}%
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
