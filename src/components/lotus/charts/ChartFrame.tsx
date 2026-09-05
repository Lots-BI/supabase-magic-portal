// Lotus · ChartFrame
// Moldura comum para todos os charts da plataforma. Garante que cada chart
// herde o mesmo tom visual (título eyebrow, valor, contexto) e nunca pareça
// "componente padrão colado dentro do produto".
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ChartFrameProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Headline opcional (ex.: total agregado do período). */
  headline?: ReactNode;
  /** Indicador opcional (ex.: delta vs período anterior). */
  meta?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function ChartFrame({
  eyebrow,
  title,
  description,
  headline,
  meta,
  legend,
  children,
  className,
  bodyClassName,
}: ChartFrameProps) {
  return (
    <section className={cn("lotus-surface relative isolate z-0 overflow-hidden", className)}>
      <header className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
              {eyebrow}
            </p>
          )}
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {headline && (
          <div className="min-w-0 shrink-0 sm:text-right">
            <div className="font-display text-xl font-semibold tabular-nums leading-none text-foreground sm:text-2xl">
              {headline}
            </div>
            {meta && <div className="mt-1 text-[11px] text-muted-foreground">{meta}</div>}
          </div>
        )}
      </header>
      {legend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/40 bg-muted/30 px-4 py-2 sm:px-5">
          {legend}
        </div>
      )}
      <div
        className={cn("relative min-w-0 overflow-hidden px-1 py-2 sm:px-3 sm:py-3", bodyClassName)}
      >
        {children}
      </div>
    </section>
  );
}

export function ChartLegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[11.5px] text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden />
      <span className="font-medium text-foreground">{label}</span>
      {value && <span className="tabular-nums">· {value}</span>}
    </span>
  );
}
