import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plug, ArrowRight, Clock, TrendingDown } from "lucide-react";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import { getHubAgencyAlerts } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";

export function HubIntegrationsAlertCard() {
  const { data: overview } = useQuery({
    queryKey: hubAdminKeys.overview(),
    queryFn: async () => {
      const { getHubOverview } = await import("@/modules/platform-hub-admin/hub-admin.server");
      return getHubOverview();
    },
    staleTime: 60_000,
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: [...hubAdminKeys.all, "agency-alerts"],
    queryFn: () => getHubAgencyAlerts(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="lots-skeleton h-36 rounded-xl" />;
  }

  const summary = overview?.overview;
  const hasIssues =
    (alerts?.unhealthy.length ?? 0) > 0 ||
    (alerts?.degraded.length ?? 0) > 0 ||
    (alerts?.staleSync.length ?? 0) > 0 ||
    (alerts?.lowCoverage.length ?? 0) > 0;

  return (
    <SectionCard
      title="Integrações Platform Hub"
      description="Saúde, sync atrasada e coverage — em tempo real."
      actions={
        <Button asChild variant="ghost" size="sm" className="lots-focus">
          <Link to="/admin/conexoes">
            Ver todas
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      {summary && (
        <div className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Saudáveis</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.healthy}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Degradadas</p>
            <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {summary.degraded}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Com erro</p>
            <p className="text-lg font-semibold text-destructive">{summary.withError}</p>
          </div>
        </div>
      )}

      {hasIssues ? (
        <div className="mx-4 mb-4 space-y-2">
          {(alerts?.unhealthy.length ?? 0) > 0 && (
            <AlertRow
              icon={AlertTriangle}
              label={`${alerts!.unhealthy.length} com erro`}
              href="/admin/conexoes/health"
            />
          )}
          {(alerts?.degraded.length ?? 0) > 0 && (
            <AlertRow
              icon={TrendingDown}
              label={`${alerts!.degraded.length} degradada(s)`}
              href="/admin/conexoes/health"
            />
          )}
          {(alerts?.staleSync.length ?? 0) > 0 && (
            <AlertRow
              icon={Clock}
              label={`${alerts!.staleSync.length} sync atrasada(s)`}
              href="/admin/conexoes"
            />
          )}
          {(alerts?.lowCoverage.length ?? 0) > 0 && (
            <AlertRow
              icon={TrendingDown}
              label={`${alerts!.lowCoverage.length} coverage baixo`}
              href="/admin/conexoes/migracao"
            />
          )}
        </div>
      ) : summary?.total === 0 ? (
        <div className="mx-4 mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Plug className="h-4 w-4" />
          Nenhuma plataforma conectada.{" "}
          <Link
            to="/admin/conexoes/nova"
            search={{}}
            className="font-medium text-primary underline"
          >
            Conectar agora
          </Link>
        </div>
      ) : (
        <p className="mx-4 mb-4 text-sm text-muted-foreground">
          Todas as integrações dentro do esperado.
        </p>
      )}
    </SectionCard>
  );
}

function AlertRow({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof AlertTriangle;
  label: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        {label}
      </span>
      <Link to={href} className="text-xs font-medium underline">
        Ver
      </Link>
    </div>
  );
}
