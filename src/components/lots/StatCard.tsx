import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus } from "lucide-react";
import { MetricLabel } from "./MetricLabel";

export interface StatCardOption {
  key: string;
  label: string;
  value: string;
  description?: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  /** Texto auxiliar abaixo do valor (ex.: taxa derivada). */
  hint?: string;
  /** Tooltip explicativo da métrica. */
  description?: string;
  icon?: LucideIcon;
  /** Percent change vs previous period (e.g. 12.4 for +12.4%). */
  delta?: number | null;
  /** When true, a positive delta is GOOD (green). Set false for things like CPC. */
  positiveIsGood?: boolean;
  /** Visual weight — `hero` for the executive headline KPI. */
  emphasis?: "hero" | "default" | "compact";
  className?: string;
  /** Seletor da métrica exibida no card. */
  options?: StatCardOption[];
  optionsLabel?: string;
  selectedKey?: string;
  onSelect?: (key: string) => void;
}

const numberFmt = (v: string | number) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v);

/**
 * StatCard — KPI card with optional delta + context. Solid surface (no glass),
 * subtle petal accent on `hero` variant, branded hover lift.
 */
export const StatCard = memo(function StatCard({
  label,
  value,
  hint,
  description,
  icon: Icon,
  delta,
  positiveIsGood = true,
  emphasis = "default",
  className,
  options,
  optionsLabel = "Métrica do resultado",
  selectedKey,
  onSelect,
}: StatCardProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const trend = hasDelta ? (delta === 0 ? "flat" : delta > 0 ? "up" : "down") : null;
  const good = trend === "flat" || trend === null ? null : (trend === "up") === positiveIsGood;

  const isHero = emphasis === "hero";
  const isCompact = emphasis === "compact";
  const [open, setOpen] = useState(false);
  const hasOptions = (options?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        "lots-surface lots-hoverable relative isolate z-0 flex h-full min-w-0 flex-col overflow-hidden",
        isHero && "lots-petal-accent bg-gradient-to-br from-card to-muted/70",
        isCompact ? "p-3.5 sm:p-4" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <MetricLabel
          label={label}
          description={description}
          className={cn("min-w-0", isHero ? "text-[11px]" : "text-[10.5px]")}
        />
        {Icon && (
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-lg border border-border bg-muted text-primary-600 dark:text-primary-300",
              isCompact ? "h-7 w-7" : "h-8 w-8",
            )}
          >
            <Icon className="h-[14px] w-[14px]" />
          </span>
        )}
      </div>

      <div className={cn("mt-auto flex min-w-0 flex-col gap-1.5 pt-3", isHero && "sm:pt-4")}>
        <span
          className={cn(
            "min-w-0 max-w-full truncate font-display font-semibold tracking-[-0.02em] tabular-nums text-foreground",
            isHero
              ? "text-[1.35rem] leading-none sm:text-3xl lg:text-4xl"
              : isCompact
                ? "text-lg leading-none sm:text-xl"
                : "text-xl leading-none sm:text-2xl",
          )}
        >
          {numberFmt(value)}
        </span>
        {hasDelta && (
          <span
            className={cn(
              "inline-flex w-fit max-w-full items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              good === null && "bg-muted text-muted-foreground",
              good === true && "bg-success/12 text-[color:var(--success)]",
              good === false && "bg-danger/12 text-[color:var(--danger)]",
            )}
          >
            {trend === "flat" ? (
              <Minus className="h-3 w-3 shrink-0" />
            ) : trend === "up" ? (
              <ArrowUpRight className="h-3 w-3 shrink-0" />
            ) : (
              <ArrowDownRight className="h-3 w-3 shrink-0" />
            )}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        {hasOptions ? (
          <div className="mt-1">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((was) => !was)}
              className="lots-focus inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              {optionsLabel}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>
            {open ? (
              <ul className="mt-1.5 overflow-hidden rounded-lg border border-border bg-background">
                {options!.map((option) => {
                  const selected = option.key === selectedKey;
                  return (
                    <li key={option.key}>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5",
                          selected ? "bg-primary/10" : "hover:bg-muted/60",
                        )}
                      >
                        {option.description ? (
                          <MetricLabel
                            iconOnly
                            label={option.label}
                            description={option.description}
                          />
                        ) : null}
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setOpen(false);
                            onSelect?.(option.key);
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-center justify-between gap-3 text-left text-[12px]",
                            selected
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="min-w-0 truncate">{option.label}</span>
                          <span className="shrink-0 tabular-nums">{option.value}</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
