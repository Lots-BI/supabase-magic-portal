import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface MetricLabelProps {
  label: string;
  description?: string;
  className?: string;
}

/** Rótulo de KPI com tooltip explicativo (acessível via hover e foco). */
export function MetricLabel({ label, description, className }: MetricLabelProps) {
  if (!description) {
    return (
      <p className={cn("font-medium uppercase tracking-[0.08em] text-muted-foreground", className)}>
        {label}
      </p>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "lots-focus inline-flex max-w-full items-center gap-1 text-left font-medium uppercase tracking-[0.08em] text-muted-foreground",
            className,
          )}
          aria-label={`${label}: ${description}`}
        >
          <span className="truncate">{label}</span>
          <Info className="h-3 w-3 shrink-0 opacity-55" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-left leading-snug">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
