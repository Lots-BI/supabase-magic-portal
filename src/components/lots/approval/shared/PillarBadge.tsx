import { cn } from "@/lib/utils";

export type PillarSummary = {
  titulo: string;
  cor: string;
  objetivo?: string | null;
};

export function PillarBadge({
  pillar,
  className,
}: {
  pillar: PillarSummary | null | undefined;
  className?: string;
}) {
  if (!pillar) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2",
        className,
      )}
    >
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
        style={{ backgroundColor: pillar.cor }}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{pillar.titulo}</p>
        {pillar.objetivo?.trim() && (
          <p className="mt-0.5 text-xs text-muted-foreground">{pillar.objetivo}</p>
        )}
      </div>
    </div>
  );
}
