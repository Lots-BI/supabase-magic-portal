import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { DashboardsHub } from "@/components/lots/DashboardsHub";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { brandTitle } from "@/lib/brand";
import { dashboardAccountsQuery } from "@/lib/dashboard-accounts-query";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: brandTitle("Dashboards") }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(dashboardAccountsQuery);
  },
  component: ClientDashboardsPage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">
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
  const { data: accounts } = useSuspenseQuery(dashboardAccountsQuery);

  return (
    <DashboardsHub
      accounts={accounts}
      syncQueryName={isAdmin && accounts.length === 1 ? accounts[0]?.name : undefined}
      emptyTitle="Sua conta está sendo preparada"
      emptyDescription="Em breve os dashboards de cada plataforma aparecem aqui. Enquanto isso, a agência está configurando as integrações da sua operação."
    />
  );
}
