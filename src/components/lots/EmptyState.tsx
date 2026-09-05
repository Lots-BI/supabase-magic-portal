import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/** Estado vazio padronizado — ícone, título e descrição opcional. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-2xl bg-primary/10 text-primary-600 dark:text-primary-300",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>
      <div className="max-w-md space-y-1">
        <p
          className={cn(
            "font-display font-semibold text-foreground",
            compact ? "text-sm" : "text-base",
          )}
        >
          {title}
        </p>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
