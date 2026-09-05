import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { ClientConnectionsPage } from "@/components/lotus/platform-hub/ClientConnectionsPage";
import { clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/conexoes")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Conexões — ${params.cliente}`) }],
  }),
  component: ClienteConexoesPage,
});

function ClienteConexoesPage() {
  const { cliente: slug } = Route.useParams();

  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={2} />}>
      <ClienteConexoesResolved slug={slug} />
    </Suspense>
  );
}

function ClienteConexoesResolved({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref?.cadastroId) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return <ClientConnectionsPage cadastroClienteId={ref.cadastroId} clienteSlug={slug} />;
}
