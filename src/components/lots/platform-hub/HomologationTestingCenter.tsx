import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FlaskConical, Play, FileDown } from "lucide-react";
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
import { useState } from "react";
import { getHubConnections } from "@/modules/platform-hub-admin/hub-admin.server";
import {
  getHomologationReports,
  runHomologationDualRunFn,
  runHomologationTestSuite,
  persistHomologationComparison,
  reprocessHomologationComparison,
} from "@/modules/platform-hub-admin/hub-homologation.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { HubHealthBadge, HubProviderBadge, PlatformLogoBadge } from "./hub-badges";

export function HomologationTestingCenter() {
  const qc = useQueryClient();
  const [connectionId, setConnectionId] = useState<string>("");

  const { data: connections } = useQuery({
    queryKey: hubAdminKeys.connections({}),
    queryFn: () => getHubConnections(),
  });

  const { data: homologation, isLoading } = useQuery({
    queryKey: [...hubAdminKeys.all, "homologation", connectionId],
    queryFn: () => getHomologationReports({ data: { connectionId } }),
    enabled: !!connectionId,
  });

  const testMutation = useMutation({
    mutationFn: () => runHomologationTestSuite({ data: { connectionId } }),
    onSuccess: (r) => {
      toast.success(`Test suite: ${r.diagnostics.overall}`);
      void qc.invalidateQueries({ queryKey: [...hubAdminKeys.all, "homologation", connectionId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const persistMutation = useMutation({
    mutationFn: () => persistHomologationComparison({ data: { connectionId } }),
    onSuccess: (r) => {
      toast.success(`Comparação persistida: ${(r.coverage * 100).toFixed(1)}%`);
      void qc.invalidateQueries({ queryKey: [...hubAdminKeys.all, "homologation", connectionId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const reprocessMutation = useMutation({
    mutationFn: () => reprocessHomologationComparison({ data: { connectionId } }),
    onSuccess: (r) => {
      toast.success(`Reprocessado: ${(r.coverage * 100).toFixed(1)}%`);
      void qc.invalidateQueries({ queryKey: [...hubAdminKeys.all, "homologation", connectionId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const dualRunMutation = useMutation({
    mutationFn: () => runHomologationDualRunFn({ data: { connectionId } }),
    onSuccess: (r) => {
      toast.success(`Dual Run: ${(r.coverage * 100).toFixed(1)}% coverage`);
      void qc.invalidateQueries({ queryKey: [...hubAdminKeys.all, "homologation", connectionId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const selected = connections?.find((c) => c.id === connectionId);

  const exportReport = () => {
    if (!homologation) return;
    const blob = new Blob([JSON.stringify(homologation, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hub-homologation-${connectionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="Platform Hub"
        title="Testing Center"
        description="Homologação base_metricas_make × base_metricas_hub — produção Make intocada."
      />

      <SectionCard title="Selecionar conexão" bodyClassName="p-4">
        <Select value={connectionId} onValueChange={setConnectionId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Escolha uma conexão" />
          </SelectTrigger>
          <SelectContent>
            {(connections ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label} · {c.pluginKey}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionCard>

      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <PlatformLogoBadge pluginKey={selected.pluginKey} />
            <HubHealthBadge status={selected.healthStatus} score={selected.healthScore} />
            <HubProviderBadge provider={selected.activeProviderType} />
          </div>

          <SectionCard title="Ações de teste">
            <div className="flex flex-wrap gap-2 p-4">
              <Button onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
                <FlaskConical className="mr-2 h-4 w-4" />
                Test suite completo
              </Button>
              <Button
                variant="outline"
                onClick={() => persistMutation.mutate()}
                disabled={persistMutation.isPending}
              >
                Persistir comparação
              </Button>
              <Button
                variant="outline"
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isPending}
              >
                Reprocessar comparação
              </Button>
              <Button
                variant="outline"
                onClick={() => dualRunMutation.mutate()}
                disabled={dualRunMutation.isPending}
              >
                <Play className="mr-2 h-4 w-4" />
                Dual Run vs Make
              </Button>
              <Button variant="ghost" onClick={exportReport} disabled={!homologation}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar relatório
              </Button>
              <Button asChild variant="ghost">
                <Link to="/admin/conexoes/$connectionId" params={{ connectionId }}>
                  Abrir conexão
                </Link>
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Histórico de comparações (ph_comparison_reports)">
            <ul className="divide-y divide-border text-sm">
              {(homologation?.comparisons ?? []).length === 0 ? (
                <li className="px-4 py-6 text-center text-muted-foreground">
                  Nenhuma comparação persistida.
                </li>
              ) : (
                (homologation?.comparisons ?? []).map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <p className="font-medium">
                      {c.fromDate} → {c.toDate} · {c.status}
                      {c.coverage != null && ` · ${(c.coverage * 100).toFixed(1)}%`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Make {c.rowsMake} rows · Hub {c.rowsHub} rows ·{" "}
                      {new Date(c.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </SectionCard>

          <SectionCard title="Relatórios de homologação">
            {isLoading ? (
              <div className="lots-skeleton m-4 h-32 rounded-lg" />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(homologation?.reports ?? []).length === 0 ? (
                  <li className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum relatório ainda. Execute o test suite ou dual run.
                  </li>
                ) : (
                  (homologation?.reports ?? []).map((r) => (
                    <li key={r.id} className="px-4 py-3">
                      <p className="font-medium">
                        {r.reportKind} · {r.overall ?? "—"}
                        {r.coverage != null && ` · ${(r.coverage * 100).toFixed(1)}%`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("pt-BR")} · {r.rowsProduced} rows ·{" "}
                        {r.durationMs ?? "—"}ms
                      </p>
                    </li>
                  ))
                )}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Debug traces (redigidos)">
            <ul className="divide-y divide-border font-mono text-xs">
              {(homologation?.traces ?? []).length === 0 ? (
                <li className="px-4 py-6 text-center font-sans text-muted-foreground">
                  Nenhum trace registrado.
                </li>
              ) : (
                (homologation?.traces ?? []).map((t) => (
                  <li key={t.id} className="px-4 py-3">
                    <p className="font-sans font-medium">{t.operation}</p>
                    <p className="text-muted-foreground">
                      {t.rowsCollected} rows · {t.pagesFetched} pages · {t.durationMs ?? "—"}ms
                    </p>
                  </li>
                ))
              )}
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}
