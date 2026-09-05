import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/lotus/EmptyState";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SyncStatusBar } from "@/components/lotus/SyncStatusBar";
import { dashboardBrandTheme, PlatformBrandMark } from "@/components/lotus/PlatformBrandMark";
import {
  catalogForPlatforms,
  DASHBOARD_CATALOG,
  DASHBOARD_FAMILY_META,
  type DashboardCatalogEntry,
  type DashboardFamilyId,
} from "@/lib/dashboards-catalog";
import { cn } from "@/lib/utils";

export type DashboardAccount = {
  name: string;
  slug: string;
  platforms: string[];
  lastData?: string | null;
};

type HubGroup = {
  family: DashboardFamilyId;
  entry: DashboardCatalogEntry;
  accounts: DashboardAccount[];
};

function buildGroups(accounts: DashboardAccount[]): HubGroup[] {
  const byDashboard = new Map<string, HubGroup>();

  for (const account of accounts) {
    for (const entry of catalogForPlatforms(account.platforms)) {
      const current = byDashboard.get(entry.id);
      if (current) {
        current.accounts.push(account);
      } else {
        byDashboard.set(entry.id, { family: entry.family, entry, accounts: [account] });
      }
    }
  }

  const order = new Map(DASHBOARD_CATALOG.map((entry, index) => [entry.id, index]));
  return Array.from(byDashboard.values()).sort((a, b) => {
    const familyDelta =
      DASHBOARD_FAMILY_META[a.family].order - DASHBOARD_FAMILY_META[b.family].order;
    if (familyDelta !== 0) return familyDelta;
    return (order.get(a.entry.id) ?? 0) - (order.get(b.entry.id) ?? 0);
  });
}

function groupsByFamily(groups: HubGroup[]) {
  const families: DashboardFamilyId[] = ["paid", "organic", "analytics"];
  return families
    .map((family) => ({
      family,
      meta: DASHBOARD_FAMILY_META[family],
      items: groups.filter((group) => group.family === family),
    }))
    .filter((section) => section.items.length > 0);
}

export function DashboardsHub({
  accounts,
  title = "Dashboards",
  description = "Escolha a plataforma para abrir o dashboard correspondente.",
  emptyTitle = "Nenhum dashboard disponível",
  emptyDescription = "Assim que uma plataforma começar a enviar métricas, ela aparece aqui.",
  syncQueryName,
}: {
  accounts: DashboardAccount[];
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  syncQueryName?: string;
}) {
  const groups = buildGroups(accounts);
  const sections = groupsByFamily(groups);
  const dashboardCount = groups.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Métricas"
        title={title}
        description={
          dashboardCount > 0
            ? `${description.replace(/\.$/, "")} · ${dashboardCount} ${
                dashboardCount === 1 ? "dashboard ativo" : "dashboards ativos"
              }.`
            : description
        }
      />
      {syncQueryName ? <SyncStatusBar queryName={syncQueryName} /> : null}

      {sections.length === 0 ? (
        <div className="lotus-surface">
          <EmptyState icon={LayoutDashboard} title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        sections.map((section) => (
          <section key={section.family} className="space-y-3">
            <header className="space-y-1">
              <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
                {section.meta.label}
              </h2>
            </header>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <li key={item.entry.id}>
                  <DashboardEntryCard group={item} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function DashboardEntryCard({ group }: { group: HubGroup }) {
  const theme = dashboardBrandTheme(group.entry.id);
  const single = group.accounts.length === 1;
  const account = group.accounts[0];

  if (single && account) {
    return (
      <Link
        to={group.entry.to}
        params={{ cliente: account.slug }}
        aria-label={`Abrir dashboard ${group.entry.label}`}
        className={cn(
          "lotus-surface lotus-focus group relative isolate flex min-h-[8.25rem] flex-col overflow-hidden p-4 sm:min-h-[8.75rem] sm:p-5",
          "transition-[transform,box-shadow,filter] duration-200",
          "hover:shadow-[var(--shadow-md)] active:scale-[0.99]",
          theme.card,
        )}
      >
        <BrandWatermark dashboardId={group.entry.id} className={theme.watermark} />
        <div className="relative z-[1] flex items-start justify-between gap-3">
          <BrandBadge dashboardId={group.entry.id} wrapClassName={theme.markWrap} />
          <ArrowUpRight className={cn("h-5 w-5 shrink-0", theme.arrow)} aria-hidden />
        </div>
        <h3
          className={cn(
            "relative z-[1] mt-auto truncate font-display text-[17px] font-semibold tracking-tight",
            theme.title,
          )}
        >
          {group.entry.label}
        </h3>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "lotus-surface relative isolate flex min-h-[8.25rem] flex-col overflow-hidden p-4 sm:p-5",
        theme.card,
      )}
    >
      <BrandWatermark dashboardId={group.entry.id} className={theme.watermark} />
      <div className="relative z-[1] flex items-center gap-3">
        <BrandBadge dashboardId={group.entry.id} wrapClassName={theme.markWrap} />
        <h3
          className={cn(
            "min-w-0 flex-1 truncate font-display text-[17px] font-semibold tracking-tight",
            theme.title,
          )}
        >
          {group.entry.label}
        </h3>
      </div>
      <ul className="relative z-[1] mt-4 divide-y divide-white/15 rounded-xl bg-black/10 dark:bg-black/20">
        {group.accounts.map((item) => (
          <li key={item.slug}>
            <Link
              to={group.entry.to}
              params={{ cliente: item.slug }}
              className="lotus-focus group flex min-h-[44px] items-center gap-3 px-3 py-2.5"
            >
              <span className={cn("min-w-0 flex-1 truncate text-[13px] font-medium", theme.title)}>
                {item.name}
              </span>
              <ArrowUpRight className={cn("h-4 w-4 shrink-0", theme.arrow)} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrandBadge({
  dashboardId,
  wrapClassName,
}: {
  dashboardId: string;
  wrapClassName: string;
}) {
  return (
    <span
      className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", wrapClassName)}
      aria-hidden
    >
      <PlatformBrandMark dashboardId={dashboardId} decorative={false} className="h-7 w-7" />
    </span>
  );
}

function BrandWatermark({ dashboardId, className }: { dashboardId: string; className?: string }) {
  return (
    <PlatformBrandMark
      dashboardId={dashboardId}
      className={cn(
        "pointer-events-none absolute -right-3 -bottom-4 h-28 w-28 opacity-[0.16]",
        className,
      )}
    />
  );
}
