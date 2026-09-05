import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { clienteRefQuery } from "./cliente.$cliente";
import { StrategicPlanJourney } from "@/components/lots/strategic-plan/StrategicPlanJourney";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/plano-estrategico/")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Plano Estratégico · ${params.cliente}`) }],
  }),
  component: ClientePlanoBootstrapPage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">
      Não foi possível carregar o plano: {error.message}
    </div>
  ),
});

function ClientePlanoBootstrapPage() {
  const { cliente: slug } = Route.useParams();
  return (
    <Suspense fallback={<div className="lots-skeleton h-48 w-full rounded-xl" />}>
      <ClientePlanoBootstrap slug={slug} />
    </Suspense>
  );
}

function ClientePlanoBootstrap({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref) {
    return <div className="text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  return (
    <StrategicPlanJourney
      slug={slug}
      clienteNome={ref.nome}
      cadastroId={ref.cadastroId}
    />
  );
}
