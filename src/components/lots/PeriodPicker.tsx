// Lots BI · PeriodPicker
// Substitui o antigo PeriodToggle. Suporta presets BRT + intervalo personalizado.
import { useEffect, useState } from "react";
import { ChevronDown, Calendar as CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PERIOD_PRESETS,
  resolvePeriod,
  type Period,
  type PeriodInput,
  type PeriodPreset,
  brtToday,
  formatBR,
} from "@/lib/period";

interface Props {
  value: PeriodInput;
  onChange: (v: PeriodInput) => void;
  className?: string;
}

export function PeriodPicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.customFrom ?? brtToday());
  const [customTo, setCustomTo] = useState(value.customTo ?? brtToday());

  useEffect(() => {
    if (value.customFrom) setCustomFrom(value.customFrom);
    if (value.customTo) setCustomTo(value.customTo);
  }, [value.customFrom, value.customTo]);

  const resolved: Period = resolvePeriod(value);

  const pick = (preset: PeriodPreset) => {
    if (preset === "custom") {
      onChange({ preset: "custom", customFrom, customTo });
    } else {
      onChange({ preset });
      setOpen(false);
    }
  };

  const applyCustom = () => {
    onChange({ preset: "custom", customFrom, customTo });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "lots-surface lots-focus inline-flex w-full max-w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[12.5px] font-medium text-foreground hover:bg-muted/40 sm:w-auto sm:justify-start sm:py-2",
            className,
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate tabular-nums">{resolved.label}</span>
            {value.preset !== "today" && value.preset !== "yesterday" && (
              <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                · {formatBR(resolved.from)} → {formatBR(resolved.to)}
              </span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="w-[min(320px,calc(100vw-2rem))] rounded-xl border-border p-2 shadow-[var(--shadow-lg)]"
      >
        <ul className="max-h-[min(320px,50dvh)] overflow-y-auto overscroll-contain">
          {PERIOD_PRESETS.map((opt) => {
            const active = value.preset === opt.value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "lots-focus flex min-h-[44px] w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-muted/50",
                    active && "bg-primary/10 text-primary-700 dark:text-primary-200",
                  )}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>

        {value.preset === "custom" && (
          <div className="mt-2 border-t border-border pt-3">
            <div className="grid grid-cols-1 gap-3 px-1 sm:grid-cols-2 sm:gap-2">
              <label className="block min-w-0">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  De
                </span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="lots-focus mt-1 w-full min-w-0 rounded-md border border-border bg-background px-2 py-2.5 text-[12.5px] text-foreground sm:py-1.5"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Até
                </span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="lots-focus mt-1 w-full min-w-0 rounded-md border border-border bg-background px-2 py-2.5 text-[12.5px] text-foreground sm:py-1.5"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end px-1">
              <button
                type="button"
                onClick={applyCustom}
                className="lots-focus min-h-[44px] rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground hover:opacity-90 sm:min-h-0 sm:py-1.5"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
