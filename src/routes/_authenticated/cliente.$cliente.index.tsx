import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { DashboardsHub } from "@/components/lotus/DashboardsHub";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { clientePlatformsQuery, clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/")({
  loader: async ({ context, params }) => {
    const ref = await context.queryClient.ensureQueryData(clienteRefQuery(params.cliente));
    if (ref?.queryName) {
      await context.queryClient.ensureQueryData(clientePlatformsQuery(ref.queryName));
    }
  },
  component: ClienteDashboardsPage,
});

function ClienteDashboardsPage() {
  const { cliente: slug } = Route.useParams();

  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <ClienteDashboardsBody slug={slug} />
    </Suspense>
  );
}

function ClienteDashboardsBody({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  if (!ref) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return <ClienteDashboardsResolved slug={slug} queryName={ref.queryName} nome={ref.nome} />;
}

const authenticatedRoute = getRouteApi("/_authenticated");

function ClienteDashboardsResolved({
  slug,
  queryName,
  nome,
}: {
  slug: string;
  queryName: string;
  nome: string;
}) {
  const { isAdmin } = authenticatedRoute.useRouteContext();
  const { data: platforms } = useSuspenseQuery(clientePlatformsQuery(queryName));

  return (
    <DashboardsHub
      title={nome}
      description="Abra o dashboard de cada plataforma conectada a esta conta."
      accounts={[
        {
          name: nome,
          slug,
          platforms,
        },
      ]}
      syncQueryName={isAdmin ? queryName : undefined}
      emptyTitle="Nenhuma plataforma com dados ainda"
      emptyDescription="Quando Instagram, anúncios ou analytics começarem a enviar métricas, os dashboards aparecem aqui."
    />
  );
}
