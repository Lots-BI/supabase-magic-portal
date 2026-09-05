import { Suspense, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClienteWorkspaceQueryName } from "@/components/lotus/cliente-workspace-context";
import { PlatformBrandMark } from "@/components/lotus/PlatformBrandMark";
import {
  catalogForPlatforms,
  DASHBOARD_CATALOG,
  type DashboardCatalogEntry,
} from "@/lib/dashboards-catalog";
import { cn } from "@/lib/utils";
import { clientePlatformsQuery } from "@/routes/_authenticated/cliente.$cliente";

export function PlatformSwitcher({
  currentId,
  currentLabel,
}: {
  currentId: string;
  currentLabel: string;
}) {
  return (
    <Suspense fallback={<span className="truncate">{currentLabel}</span>}>
      <PlatformSwitcherBody currentId={currentId} currentLabel={currentLabel} />
    </Suspense>
  );
}

function PlatformSwitcherBody({
  currentId,
  currentLabel,
}: {
  currentId: string;
  currentLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { cliente: slug } = useParams({ strict: false }) as { cliente?: string };
  const queryName = useClienteWorkspaceQueryName();

  if (!slug || !queryName) {
    return <span className="truncate">{currentLabel}</span>;
  }

  return (
    <PlatformSwitcherMenu
      slug={slug}
      queryName={queryName}
      currentId={currentId}
      currentLabel={currentLabel}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

function PlatformSwitcherMenu({
  slug,
  queryName,
  currentId,
  currentLabel,
  open,
  onOpenChange,
}: {
  slug: string;
  queryName: string;
  currentId: string;
  currentLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: platforms } = useSuspenseQuery(clientePlatformsQuery(queryName));
  const options = optionsForSwitcher(platforms, currentId);

  if (options.length <= 1) {
    return <span className="truncate">{currentLabel}</span>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Trocar plataforma"
          className="lotus-focus -ml-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-inherit transition-colors hover:bg-muted/60"
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronDown
            className={cn(
              "h-[0.8em] w-[0.8em] shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(16.5rem,calc(100vw-2rem))] p-1 shadow-[var(--shadow-md)]"
      >
        <ul className="flex flex-col">
          {options.map((entry) => {
            const active = entry.id === currentId;
            return (
              <li key={entry.id}>
                <Link
                  to={entry.to}
                  params={{ cliente: slug }}
                  onClick={() => onOpenChange(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[40px] items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <PlatformBrandMark dashboardId={entry.id} className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function optionsForSwitcher(rawPlatforms: string[], currentId: string): DashboardCatalogEntry[] {
  const options = catalogForPlatforms(rawPlatforms).filter((entry) => entry.id !== "publicacoes");
  if (options.some((entry) => entry.id === currentId)) return options;
  const current = DASHBOARD_CATALOG.find((entry) => entry.id === currentId);
  return current ? [current, ...options] : options;
}
