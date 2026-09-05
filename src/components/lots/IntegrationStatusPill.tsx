import { cn } from "@/lib/utils";
import type { IntegrationStatus } from "@/lib/integrations-catalog";
import { INTEGRATION_STATUS_LABEL } from "@/lib/integrations-catalog";

const STYLES: Record<IntegrationStatus, { dot: string; pill: string }> = {
  configured: {
    dot: "bg-success",
    pill: "bg-success/12 text-[color:var(--success)]",
  },
  partial: {
    dot: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  pre: {
    dot: "bg-sky-500",
    pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  off: {
    dot: "bg-muted-foreground/50",
    pill: "bg-muted text-muted-foreground",
  },
};

export function IntegrationStatusPill({
  status,
  className,
}: {
  status: IntegrationStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
        s.pill,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {INTEGRATION_STATUS_LABEL[status]}
    </span>
  );
}
