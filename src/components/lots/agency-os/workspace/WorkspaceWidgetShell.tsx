import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkspaceWidgetShell({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("lots-surface flex min-h-[200px] flex-col overflow-hidden", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="flex-1 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="lots-skeleton h-14 rounded-lg" />
      ))}
    </div>
  );
}
