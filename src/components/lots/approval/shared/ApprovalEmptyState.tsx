import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/lots/EmptyState";

export function ApprovalEmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      compact={compact}
      className="rounded-xl border border-dashed border-border bg-muted/20"
    />
  );
}
