import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { adminTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { ClientHealthBadge } from "@/components/lots/agency-os/ClientHealthBadge";
import { DashboardGrid } from "@/modules/core/dashboard/dashboard-engine";
import "@/modules/os-bootstrap";
import { getAgencyClient } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import { computeClientHealth } from "@/modules/agency-os/services/compute-client-health";

const clientQuery = (id: number) =>
  queryOptions({
    queryKey: agencyOsKeys.client(id),
    queryFn: () => getAgencyClient({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/admin/central/clientes/$id")({
  head: ({ params }) => ({
    meta: [{ title: adminTitle(`Cliente ${params.id}`) }],
  }),
  loader: ({ params, context }) => {
    const id = Number(params.id);
    return context.queryClient.ensureQueryData(clientQuery(id));
  },
  component: ClientWorkspacePage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function ClientWorkspacePage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={0} withChart={false} />}>
      <ClientWorkspaceContent />
    </Suspense>
  );
}

function ClientWorkspaceContent() {
  const { id } = Route.useParams();
  const clientId = Number(id);
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const health = computeClientHealth(client);

  const mrr =
    client.valor_mensal != null
      ? client.valor_mensal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        })
      : "—";

  const contractSince = client.data_inicio
    ? new Date(client.data_inicio).toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-8 pb-10">
      <Link
        to="/admin/central"
        className="lots-focus inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar à Central
      </Link>

      <header className="lots-surface space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {client.nome_cliente}
            </h1>
            {client.empresa && <p className="text-sm text-muted-foreground">{client.empresa}</p>}
          </div>
          <ClientHealthBadge tier={health.tier} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="MRR" value={mrr} />
          <Metric label="Contrato desde" value={contractSince} />
          <Metric label="Prioridade" value={client.prioridade} />
          <Metric
            label="Último contato"
            value={
              client.ultimo_contato
                ? new Date(client.ultimo_contato).toLocaleDateString("pt-BR")
                : "Sem registro"
            }
          />
        </div>

        {client.proxima_acao && (
          <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
            <span className="font-medium text-muted-foreground">Próxima ação · </span>
            {client.proxima_acao}
          </p>
        )}
      </header>

      <DashboardGrid
        dashboardId="agency-os.client-workspace"
        clientId={clientId}
        context={{ clientNome: client.nome_cliente, clientEmpresa: client.empresa }}
        className="grid gap-4 lg:grid-cols-2"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
