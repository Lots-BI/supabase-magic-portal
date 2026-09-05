import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { ClienteDiretrizesPage } from "@/components/brandbook/ClienteDiretrizesPage";
import { clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/brandbook")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Diretrizes da Marca — ${params.cliente}`) }],
  }),
  component: ClienteBrandbookPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function ClienteBrandbookPage() {
  const { cliente: slug } = Route.useParams();

  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={0} withChart={false} />}>
      <ClienteBrandbookScoped slug={slug} />
    </Suspense>
  );
}

function ClienteBrandbookScoped({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return <ClienteDiretrizesPage cadastroId={ref.cadastroId} />;
}
