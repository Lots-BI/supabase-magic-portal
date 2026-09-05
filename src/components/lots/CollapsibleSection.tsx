import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CollapsibleSectionProps {
  title: string;
  eyebrow?: string;
  description?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  eyebrow,
  description,
  badge,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("lots-surface overflow-hidden", className)}
    >
      <CollapsibleTrigger className="lots-focus flex w-full items-center gap-3 border-b border-border bg-muted/55 px-5 py-4 text-left hover:bg-muted/80 data-[state=closed]:border-b-0">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
              {eyebrow}
            </p>
          )}
          <h2 className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-5 py-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
