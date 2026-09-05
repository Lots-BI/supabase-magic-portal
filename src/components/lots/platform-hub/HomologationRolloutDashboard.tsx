import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/lots/PageHeader";
import { SectionCard } from "@/components/lots/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getHomologationRollout,
  getHomologationRolloutKpis,
  getMetricasActiveSource,
  updateHomologationStatus,
} from "@/modules/platform-hub-admin/hub-homologation.server";
import { StatCard } from "@/components/lots/StatCard";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { HubHealthBadge, PlatformLogoBadge } from "./hub-badges";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  validating: "VALIDATING",
  blocked: "BLOCKED",
  ready: "READY",
  official_ready: "OFFICIAL_READY",
  make_active: "MAKE_ACTIVE",
  make_disabled: "MAKE_DISABLED",
  cutover_ready: "CUTOVER_READY",
};

export function HomologationRolloutDashboard() {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: [...hubAdminKeys.all, "rollout"],
    queryFn: () => getHomologationRollout(),
  });

  const { data: kpis } = useQuery({
    queryKey: [...hubAdminKeys.all, "rollout-kpis"],
    queryFn: () => getHomologationRolloutKpis(),
  });

  const { data: metricasSource } = useQuery({
    queryKey: [...hubAdminKeys.all, "metricas-source"],
    queryFn: () => getMetricasActiveSource(),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { connectionId: string; homologationStatus: string }) =>
      updateHomologationStatus({
        data: {
          connectionId: input.connectionId,
          homologationStatus: input.homologationStatus as never,
        },
      }),
    onSuccess: () => {
      toast.success("Status atualizado");
      void qc.invalidateQueries({ queryKey: [...hubAdminKeys.all, "rollout"] });
    },
  });

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="Platform Hub"
        title="Rollout Dashboard"
        description="Decida quando desligar o Make — dual-run, coverage e health por plataforma."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard
          label="Coverage médio"
          value={kpis?.avgCoverage != null ? `${(kpis.avgCoverage * 100).toFixed(1)}%` : "—"}
          variant="compact"
        />
        <StatCard label="Comparações" value={kpis?.totalComparisons ?? 0} variant="compact" />
        <StatCard label="Linhas Make" value={kpis?.rowsMakeTotal ?? 0} variant="compact" />
        <StatCard label="Linhas Hub" value={kpis?.rowsHubTotal ?? 0} variant="compact" />
        <StatCard
          label="Δ % Hub vs Make"
          value={kpis?.pctDiff != null ? `${(kpis.pctDiff * 100).toFixed(1)}%` : "—"}
          variant="compact"
        />
        <StatCard
          label="Fonte dashboards"
          value={(metricasSource?.activeSource ?? "make").toUpperCase()}
          variant="compact"
        />
      </div>

      {kpis && (kpis.coverageByPlatform.length > 0 || kpis.coverageByClient.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Coverage por plataforma">
            <ul className="divide-y divide-border p-4 text-sm">
              {kpis.coverageByPlatform.map((p) => (
                <li key={p.pluginKey} className="flex justify-between py-2">
                  <span>{p.pluginKey}</span>
                  <span className="font-medium">{(p.avgCoverage * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Coverage por cliente">
            <ul className="divide-y divide-border p-4 text-sm">
              {kpis.coverageByClient.slice(0, 8).map((c) => (
                <li key={c.clienteNome} className="flex justify-between py-2">
                  <span className="truncate pr-2">{c.clienteNome}</span>
                  <span className="font-medium shrink-0">{(c.avgCoverage * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}

      <SectionCard title="Homologação por conexão">
        {isLoading ? (
          <div className="lots-skeleton m-4 h-48 rounded-lg" />
        ) : (rows ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nenhuma conexão cadastrada. Crie conexões em Conexões para acompanhar o rollout.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3">Plataforma</th>
                  <th className="p-3">Conexão</th>
                  <th className="p-3">Coverage</th>
                  <th className="p-3">Dual Run</th>
                  <th className="p-3">Health</th>
                  <th className="p-3">Última sync</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.connectionId} className="border-b border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <PlatformLogoBadge pluginKey={r.pluginKey} />
                        <span className="text-xs">{r.pluginKey}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Link
                        to="/admin/conexoes/$connectionId"
                        params={{ connectionId: r.connectionId }}
                        className="font-medium hover:underline"
                      >
                        {r.label}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.clienteNome ?? "—"}</p>
                    </td>
                    <td className="p-3">
                      {r.coverage != null ? `${(r.coverage * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className="p-3">{r.dualRunDays != null ? `${r.dualRunDays}d` : "—"}</td>
                    <td className="p-3">
                      <HubHealthBadge status={r.healthStatus} score={r.healthScore} />
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          r.homologationStatus === "official_ready" &&
                            "border-primary text-primary",
                          r.homologationStatus === "blocked" &&
                            "border-destructive text-destructive",
                        )}
                      >
                        {STATUS_LABELS[r.homologationStatus] ?? r.homologationStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <Select
                        value={r.homologationStatus}
                        onValueChange={(v) =>
                          statusMutation.mutate({
                            connectionId: r.connectionId,
                            homologationStatus: v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/admin/conexoes/testing">Testing Center</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/conexoes">Voltar às conexões</Link>
        </Button>
      </div>
    </div>
  );
}
