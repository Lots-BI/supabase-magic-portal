import { memo } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { StatCard } from "@/components/lots/StatCard";

export interface ContextualKpiCardProps {
  label: string;
  value: string;
  context: string;
  icon?: LucideIcon;
  delta?: number | null;
  onClick?: () => void;
  className?: string;
}

export const ContextualKpiCard = memo(function ContextualKpiCard({
  label,
  value,
  context,
  icon,
  delta,
  onClick,
  className,
}: ContextualKpiCardProps) {
  const interactive = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "group w-full min-w-0 text-left transition-transform duration-200",
        interactive && "lots-focus cursor-pointer hover:-translate-y-0.5",
        !interactive && "cursor-default",
        className,
      )}
      aria-label={interactive ? `${label}: ${value}. ${context}` : undefined}
    >
      <StatCard
        label={label}
        value={value}
        hint={context}
        icon={icon}
        delta={delta}
        emphasis="default"
        className={cn(
          "h-full",
          interactive && "group-hover:border-primary/25 group-hover:shadow-[var(--shadow-sm)]",
        )}
      />
      {interactive && (
        <span className="mt-1 flex items-center gap-0.5 px-1 text-[10.5px] font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-300">
          Ver detalhes
          <ChevronRight className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
});
