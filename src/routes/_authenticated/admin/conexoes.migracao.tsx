import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { adminTitle } from "@/lib/brand";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { MIGRATION_STAGES } from "@/modules/platform-hub-admin/types";
import { getHubConnections } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { cn } from "@/lib/utils";

const migrationQuery = queryOptions({
  queryKey: [...hubAdminKeys.all, "migration"],
  queryFn: () => getHubConnections(),
});

export const Route = createFileRoute("/_authenticated/admin/conexoes/migracao")({
  head: () => ({ meta: [{ title: adminTitle("Migração Make → Hub") }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(migrationQuery),
  component: MigracaoPage,
});

function MigracaoPage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={3} withChart={false} />}>
      <MigracaoContent />
    </Suspense>
  );
}

function MigracaoContent() {
  const { data: connections } = useSuspenseQuery(migrationQuery);

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="Platform Hub"
        title="Painel de migração"
        description="Acompanhe a transição Make Passive → Official API por conexão."
      />

      <SectionCard title="Pipeline de migração">
        <div className="flex flex-wrap items-center gap-2 p-4 text-xs">
          {MIGRATION_STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2">
              <span className="rounded-full border border-border px-3 py-1 font-medium">
                {stage.label}
              </span>
              {i < MIGRATION_STAGES.length - 1 && (
                <span className="text-muted-foreground" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Conexões por estágio">
        <ul className="divide-y divide-border">
          {connections.map((c) => {
            const stageIndex = MIGRATION_STAGES.findIndex((s) => s.id === c.migrationStage);
            return (
              <li
                key={c.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  to="/admin/conexoes/$connectionId"
                  params={{ connectionId: c.id }}
                  className="font-medium hover:underline"
                >
                  {c.label}
                </Link>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {MIGRATION_STAGES.map((s, i) => (
                      <div
                        key={s.id}
                        className={cn(
                          "h-2 w-6 rounded-full",
                          i <= stageIndex ? "bg-primary" : "bg-muted",
                        )}
                        title={s.label}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.coverage !== null ? `${(c.coverage * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}
