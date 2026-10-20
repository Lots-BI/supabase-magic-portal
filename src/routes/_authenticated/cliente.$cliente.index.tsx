import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ClientOverview } from "@/components/lots/ClientOverview";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { dashboardAccountsQuery } from "@/lib/dashboard-accounts-query";
import { clientePlatformsQuery, clienteRefQuery } from "./cliente.$cliente";

const authenticatedRoute = getRouteApi("/_authenticated");

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
  const { isOrgOperator } = authenticatedRoute.useRouteContext();
  const { data: accounts } = useSuspenseQuery(dashboardAccountsQuery);
  const { data: platforms } = useSuspenseQuery(clientePlatformsQuery(queryName, cadastroId));
  const ownsAccount = accounts.some(
    (account) => account.slug === slug || account.name === queryName,
  );

  if (!isOrgOperator && accounts.length > 0 && !ownsAccount) {
    return (
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Esta visão geral não faz parte da sua conta.
      </div>
    );
  }

  return <ClientOverview nome={nome} slug={slug} queryName={queryName} platforms={platforms} />;
}
