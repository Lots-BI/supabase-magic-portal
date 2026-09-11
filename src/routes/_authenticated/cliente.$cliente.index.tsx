import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { DashboardsHub } from "@/components/lots/DashboardsHub";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { clientePlatformsQuery, clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/")({
  loader: async ({ context, params }) => {
    const ref = await context.queryClient.ensureQueryData(clienteRefQuery(params.cliente));
    if (ref?.queryName) {
      await context.queryClient.ensureQueryData(
        clientePlatformsQuery(ref.queryName, ref.cadastroId),
      );
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
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <ClienteDashboardsResolved
      slug={slug}
      queryName={ref.queryName}
      nome={ref.nome}
      cadastroId={ref.cadastroId}
    />
  );
}

const authenticatedRoute = getRouteApi("/_authenticated");

function ClienteDashboardsResolved({
  slug,
  queryName,
  nome,
  cadastroId,
}: {
  slug: string;
  queryName: string;
  nome: string;
  cadastroId: number | null;
}) {
  const { isAdmin } = authenticatedRoute.useRouteContext();
  const { data: platforms } = useSuspenseQuery(clientePlatformsQuery(queryName, cadastroId));

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
      emptyDescription="Conecte Instagram ou Meta Ads em Conexões — os dashboards aparecem aqui mesmo antes das primeiras métricas."
    />
  );
}
