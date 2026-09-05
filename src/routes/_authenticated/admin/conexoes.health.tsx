import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { adminTitle } from "@/lib/brand";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { HubHealthBadge } from "@/components/lots/platform-hub/hub-badges";
import { getHubConnections } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";

const healthQuery = queryOptions({
  queryKey: hubAdminKeys.health(),
  queryFn: () => getHubConnections(),
});

export const Route = createFileRoute("/_authenticated/admin/conexoes/health")({
  head: () => ({ meta: [{ title: adminTitle("Health — Conexões") }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(healthQuery),
  component: HealthPage,
});

function HealthPage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} withChart={false} />}>
      <HealthContent />
    </Suspense>
  );
}

function HealthContent() {
  const { data: connections } = useSuspenseQuery(healthQuery);
  const groups = {
    healthy: connections.filter((c) => c.healthStatus === "healthy"),
    degraded: connections.filter((c) => c.healthStatus === "degraded"),
    unhealthy: connections.filter((c) => c.healthStatus === "unhealthy"),
    unknown: connections.filter((c) => c.healthStatus === "unknown"),
  };

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="Platform Hub"
        title="Painel Health"
        description="Status operacional de todas as conexões."
      />
      {(Object.entries(groups) as Array<[keyof typeof groups, typeof connections]>).map(
        ([status, items]) => (
          <SectionCard key={status} title={status}>
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma conexão.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>
                      {c.label} · {c.clienteNome}
                    </span>
                    <HubHealthBadge status={c.healthStatus} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ),
      )}
    </div>
  );
}
