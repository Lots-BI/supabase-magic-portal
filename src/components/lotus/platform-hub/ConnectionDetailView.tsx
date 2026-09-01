import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Stethoscope, ArrowLeftRight, Trash2, Pencil, Power } from "lucide-react";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/lotus/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HubHealthBadge, HubProviderBadge } from "./hub-badges";
import { HubCredentialPanel } from "./HubCredentialPanel";
import { HubIdentityPicker } from "./HubIdentityPicker";
import {
  deleteHubConnection,
  runHubDiagnostics,
  startHubOAuth,
  switchHubProvider,
  syncHubConnection,
  updateHubConnection,
  updateHubMigrationStage,
} from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import { MIGRATION_STAGES, type HubDiagnosticReportV1 } from "@/modules/platform-hub-admin/types";
import { openHubOAuthPopup } from "./oauth-popup";
import { cn } from "@/lib/utils";

interface ConnectionDetailViewProps {
  detail: Awaited<
    ReturnType<
      typeof import("@/modules/platform-hub-admin/hub-admin.server").getHubConnectionDetail
    >
  >;
}

export function ConnectionDetailView({ detail }: ConnectionDetailViewProps) {
  const qc = useQueryClient();
  const { connection, identities, syncRuns, health, timeline, manifest } = detail;
  const [diagnostic, setDiagnostic] = useState<HubDiagnosticReportV1 | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(connection.label);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: hubAdminKeys.connection(connection.id) });

  const syncMutation = useMutation({
    mutationFn: () => syncHubConnection({ data: { connectionId: connection.id } }),
    onSuccess: () => {
      toast.success("Sincronização concluída");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const diagMutation = useMutation({
    mutationFn: () => runHubDiagnostics({ data: { connectionId: connection.id } }),
    onSuccess: (report) => {
      setDiagnostic(report);
      toast.success(`Diagnóstico: ${report.overall}`);
    },
  });

  const oauthMutation = useMutation({
    mutationFn: async () => {
      const r = await startHubOAuth({
        data: {
          connectionId: connection.id,
          redirectAfter: `/admin/conexoes/nova?connectionId=${connection.id}&step=4`,
        },
      });
      return openHubOAuthPopup(r.authorizationUrl);
    },
    onSuccess: (result) => {
      window.location.assign(result.redirectAfter);
    },
    onError: (e) => toast.error(e.message),
  });

  const switchMutation = useMutation({
    mutationFn: (provider: "make_passive" | "official_api") =>
      switchHubProvider({ data: { connectionId: connection.id, activeProviderType: provider } }),
    onSuccess: () => {
      toast.success("Provider atualizado");
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { label?: string; status?: "active" | "disabled" }) =>
      updateHubConnection({ data: { connectionId: connection.id, ...input } }),
    onSuccess: () => {
      toast.success("Conexão atualizada");
      setEditOpen(false);
      invalidate();
    },
  });

  const migrationMutation = useMutation({
    mutationFn: (migrationStage: (typeof MIGRATION_STAGES)[number]["id"]) =>
      updateHubMigrationStage({ data: { connectionId: connection.id, migrationStage } }),
    onSuccess: () => {
      toast.success("Estágio de migração atualizado");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHubConnection({ data: { connectionId: connection.id } }),
    onSuccess: () => {
      toast.success("Conexão excluída");
      window.location.href = "/admin/conexoes";
    },
  });

  const stageIndex = MIGRATION_STAGES.findIndex((s) => s.id === connection.migrationStage);

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="Conexão"
        title={connection.label}
        description={`${connection.clienteNome ?? "—"} · ${connection.pluginKey}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateMutation.mutate({
                  status: connection.status === "active" ? "disabled" : "active",
                })
              }
            >
              <Power className="mr-2 h-4 w-4" />
              {connection.status === "active" ? "Desativar" : "Reativar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", syncMutation.isPending && "animate-spin")} />
              Sincronizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => diagMutation.mutate()}>
              <Stethoscope className="mr-2 h-4 w-4" />
              Diagnosticar
            </Button>
            {manifest.oauth && (
              <Button
                size="sm"
                onClick={() => oauthMutation.mutate()}
                disabled={oauthMutation.isPending}
              >
                Reconectar OAuth
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <HubHealthBadge status={connection.healthStatus} score={connection.healthScore} />
        <HubProviderBadge provider={connection.activeProviderType} />
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
            connection.status === "active"
              ? "border-success/30 bg-success/10 text-success"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {connection.status === "active" ? "Ativa" : "Desativada"}
        </span>
      </div>

      <SectionCard title="Homologação paralela">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Produção (dashboards)</p>
            <p className="font-semibold text-sm">MAKE → vw_metricas → make</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Platform Hub writer</p>
            <p className="font-semibold text-sm">HUB → base_metricas_hub</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Coverage</p>
            <p className="font-semibold">
              {connection.coverage != null ? `${(connection.coverage * 100).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Estágio migração</p>
            <p className="font-semibold text-sm">{connection.migrationStage}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/conexoes/testing">Testing Center</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/conexoes/rollout">Rollout Dashboard</Link>
          </Button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Resumo operacional">
          <dl className="grid gap-2 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Health score</dt>
              <dd>{health.score}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Última sync</dt>
              <dd>
                {connection.lastSyncAt
                  ? new Date(connection.lastSyncAt).toLocaleString("pt-BR")
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status sync</dt>
              <dd>{connection.lastSyncStatus ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Métricas</dt>
              <dd>{connection.metricsCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Coverage</dt>
              <dd>
                {connection.coverage !== null ? `${(connection.coverage * 100).toFixed(1)}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">API version</dt>
              <dd>{connection.apiVersion ?? "—"}</dd>
            </div>
            {connection.lastError && (
              <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                {connection.lastError}
              </div>
            )}
          </dl>
        </SectionCard>

        <SectionCard title="Provider">
          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              Capabilities: {manifest.capabilities.join(", ")}
            </p>
            <div className="flex flex-wrap gap-2">
              {manifest.providers.supported.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={connection.activeProviderType === p ? "default" : "outline"}
                  onClick={() => switchMutation.mutate(p as "make_passive" | "official_api")}
                >
                  <ArrowLeftRight className="mr-1 h-3 w-3" />
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Migração Make → Official"
        description="Acompanhe o estágio de cutover desta conexão."
      >
        <div className="flex flex-wrap gap-2 p-4">
          {MIGRATION_STAGES.map((s, i) => (
            <Button
              key={s.id}
              size="sm"
              variant={connection.migrationStage === s.id ? "default" : "outline"}
              className={cn(
                i <= stageIndex && connection.migrationStage !== s.id && "border-primary/40",
              )}
              onClick={() => migrationMutation.mutate(s.id)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Credenciais"
        description="Gerenciadas no Credential Vault — segredos nunca exibidos."
      >
        <HubCredentialPanel connectionId={connection.id} />
      </SectionCard>

      <SectionCard
        title="Identidades"
        actions={
          <Button size="sm" variant="outline" onClick={() => setIdentityOpen(true)}>
            Adicionar / atualizar
          </Button>
        }
      >
        {identities.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma identidade vinculada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {identities.map((id) => (
              <li key={id.identityId} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  {id.label} <span className="text-muted-foreground">({id.identityType})</span>
                  {id.isPrimary && <span className="ml-2 text-xs text-primary">primária</span>}
                </span>
                <span className="font-mono text-xs">{id.externalId}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {diagnostic && (
        <SectionCard title="Centro de diagnóstico">
          <ul className="divide-y divide-border">
            {diagnostic.checks.map((c) => (
              <li key={c.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <span>{c.label}</span>
                <span
                  className={
                    c.status === "ok"
                      ? "text-success"
                      : c.status === "warning"
                        ? "text-warning"
                        : "text-danger"
                  }
                >
                  {c.detail}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Histórico de sincronizações">
        <ul className="divide-y divide-border text-sm">
          {syncRuns.length === 0 ? (
            <li className="p-4 text-muted-foreground">Nenhuma execução registrada.</li>
          ) : (
            syncRuns.map((run) => (
              <li
                key={run.executionId}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between"
              >
                <span>{new Date(run.startedAt).toLocaleString("pt-BR")}</span>
                <span>
                  {run.status} · {run.rowsCount} rows · {run.durationMs ?? "—"}ms ·{" "}
                  {run.providerType}
                </span>
                {run.errorMessage && (
                  <span className="text-xs text-destructive">{run.errorMessage}</span>
                )}
              </li>
            ))
          )}
        </ul>
      </SectionCard>

      <SectionCard title="Timeline">
        <ul className="divide-y divide-border text-sm">
          {timeline.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <p className="font-medium">{e.title}</p>
              {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
              <p className="text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString("pt-BR")} · {e.kind}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Excluir conexão
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar conexão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-label">Nome</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => updateMutation.mutate({ label: editLabel })}
              disabled={!editLabel.trim()}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={identityOpen} onOpenChange={setIdentityOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular identidades</DialogTitle>
          </DialogHeader>
          <HubIdentityPicker
            connectionId={connection.id}
            pluginKey={connection.pluginKey}
            onComplete={() => {
              setIdentityOpen(false);
              invalidate();
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir conexão?"
        description="Esta ação remove credenciais, identidades e histórico associados."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
