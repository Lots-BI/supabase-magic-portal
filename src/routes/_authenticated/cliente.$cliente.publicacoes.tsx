import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { InstagramPostsPage } from "@/components/lotus/instagram-posts/InstagramPostsPage";
import { clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/publicacoes")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Publicações — ${params.cliente}`) }],
  }),
  component: ClientePublicacoesPage,
});

function ClientePublicacoesPage() {
  const { cliente: slug } = Route.useParams();

  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <ClientePublicacoesResolved slug={slug} />
    </Suspense>
  );
}

function ClientePublicacoesResolved({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref?.cadastroId) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <InstagramPostsPage cadastroClienteId={ref.cadastroId} clienteNome={ref.nome} />
  );
}
