import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Padding for the body (default px-5 py-5). */
  bodyClassName?: string;
}

export function SectionCard({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "lotus-surface relative isolate z-0 min-w-0 max-w-full overflow-hidden",
        className,
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
              {eyebrow}
            </p>
          )}
          <h2 className="break-words font-display text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
            {actions}
          </div>
        )}
      </header>
      <div className={cn("px-4 py-4 sm:px-5 sm:py-5", bodyClassName)}>{children}</div>
    </section>
  );
}
