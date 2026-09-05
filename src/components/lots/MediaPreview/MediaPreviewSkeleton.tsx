import { cn } from "@/lib/utils";

export function MediaPreviewSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse overflow-hidden rounded-xl border border-border bg-muted/30",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="h-8 w-8 rounded-full bg-muted" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-24 rounded bg-muted" />
          <div className="h-2 w-16 rounded bg-muted/70" />
        </div>
      </div>
      <div className="aspect-square bg-muted/50" />
      <div className="space-y-2 p-3">
        <div className="h-2.5 w-full rounded bg-muted" />
        <div className="h-2.5 w-4/5 rounded bg-muted/80" />
      </div>
    </div>
  );
}
