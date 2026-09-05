import { cn } from "@/lib/utils";
import type { ClientHealthTier } from "@/modules/agency-os";

const TIER_META: Record<
  ClientHealthTier,
  { label: string; dot: string; text: string; bg: string }
> = {
  excellent: {
    label: "Excelente",
    dot: "bg-success",
    text: "text-[color:var(--success)]",
    bg: "bg-success/12",
  },
  good: {
    label: "Bom",
    dot: "bg-info",
    text: "text-[color:var(--info)]",
    bg: "bg-info/12",
  },
  attention: {
    label: "Atenção",
    dot: "bg-warning",
    text: "text-[color:var(--warning)]",
    bg: "bg-warning/12",
  },
  critical: {
    label: "Crítico",
    dot: "bg-danger",
    text: "text-[color:var(--danger)]",
    bg: "bg-danger/12",
  },
};

export function ClientHealthBadge({
  tier,
  size = "md",
  className,
}: {
  tier: ClientHealthTier;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = TIER_META[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]",
        meta.bg,
        meta.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
