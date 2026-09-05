import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { DashboardsHub } from "@/components/lotus/DashboardsHub";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { brandTitle } from "@/lib/brand";
import { clientesAtivosQuery } from "@/lib/clientes-ativos";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: brandTitle("Dashboards") }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesAtivosQuery);
  },
  component: ClientDashboardsPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">
      Erro ao carregar dashboards: {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

function ClientDashboardsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <DashboardsBody />
    </Suspense>
  );
}

const authenticatedRoute = getRouteApi("/_authenticated");

function DashboardsBody() {
  const { isAdmin } = authenticatedRoute.useRouteContext();
  const { data: clientes } = useSuspenseQuery(clientesAtivosQuery);

  return (
    <DashboardsHub
      accounts={clientes.map((cliente) => ({
        name: cliente.cliente,
        slug: slugify(cliente.cliente),
        platforms: cliente.plataformas_ativas ?? [],
        lastData: cliente.ultima_data_recebida,
      }))}
      syncQueryName={isAdmin && clientes.length === 1 ? clientes[0]?.cliente : undefined}
      emptyTitle="Sua conta está sendo preparada"
      emptyDescription="Em breve os dashboards de cada plataforma aparecem aqui. Enquanto isso, a agência está configurando as integrações da sua operação."
    />
  );
}
