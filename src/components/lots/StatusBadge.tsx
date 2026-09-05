import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  active: boolean;
  labelActive?: string;
  labelInactive?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  active,
  labelActive = "Ativo",
  labelInactive = "Inativo",
  size = "md",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[11.5px]",
        active ? "bg-success/12 text-[color:var(--success)]" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-success" : "bg-muted-foreground/50")}
      />
      {active ? labelActive : labelInactive}
    </span>
  );
}
