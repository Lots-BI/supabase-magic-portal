import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  Layers,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { getApprovalOpsDashboard } from "@/modules/approval/dashboard/dashboard.server";
import { formatDurationMs } from "@/modules/approval/dashboard/services/build-ops-dashboard";
import { KANBAN_COLUMN_META } from "../kanban/kanban-meta";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";

export function OpsDashboardPanel({ cadastroClienteId }: { cadastroClienteId?: number }) {
  const dashFn = useServerFn(getApprovalOpsDashboard);

  const dashQ = useQuery({
    queryKey: ["approval", "ops-dashboard", cadastroClienteId ?? "all"],
    queryFn: () =>
      dashFn({
        data: cadastroClienteId != null ? { cadastro_cliente_id: cadastroClienteId } : {},
      }),
  });

  if (dashQ.isLoading) return <DashboardSkeleton kpiCount={4} withChart={false} />;

  const data = dashQ.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de cards" value={data.totalCards} icon={Layers} />
        <StatCard
          label="Aguardando aprovação"
          value={data.awaitingApproval}
          icon={Clock}
          emphasis={data.awaitingApproval > 0 ? "hero" : "default"}
        />
        <StatCard
          label="Pedidos de alteração"
          value={data.changesRequested}
          icon={Clock}
          emphasis={data.changesRequested > 0 ? "hero" : "default"}
        />
        <StatCard label="Publicados (semana)" value={data.publishedThisWeek} icon={CheckCircle2} />
        <StatCard
          label="Atrasados"
          value={data.overdueCount}
          icon={CalendarClock}
          emphasis={data.overdueCount > 0 ? "hero" : "default"}
        />
        <StatCard label="Publicados" value={data.publishedCount} icon={BarChart3} />
        <StatCard label="Arquivados" value={data.archivedCount} icon={Archive} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Por status" description="Distribuição operacional">
          <ul className="space-y-2">
            {data.byStatus.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {KANBAN_COLUMN_META[row.status as ContentCardStatus]?.emoji}{" "}
                  {row.status.replace(/_/g, " ")}
                </span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Por cliente" description="Volume de cards">
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {data.byClient.slice(0, 12).map((row) => (
              <li
                key={row.cadastro_cliente_id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">{row.cliente_nome}</span>
                <span className="ml-2 font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Por responsável" description="Carga por social media">
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {data.byResponsavel.slice(0, 12).map((row) => (
              <li key={row.responsavel_email} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 truncate">
                  <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {row.responsavel_email}
                </span>
                <span className="ml-2 font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Tempo médio por etapa" description="Derivado de content_card_events">
          <ul className="space-y-2">
            {data.stageAverages.map((stage) => (
              <li
                key={stage.stageKey}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{stage.label}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatDurationMs(stage.averageMs)}
                  {stage.sampleSize > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (n={stage.sampleSize})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Métricas avançadas"
        description="Estrutura preparada — sem integrações externas"
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {Object.entries(data.metricsFramework).map(([key, meta]) => (
            <li
              key={key}
              className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
            >
              <span className="font-medium capitalize text-foreground">{key}</span>
              <p className="mt-0.5 text-xs">{meta.description}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
