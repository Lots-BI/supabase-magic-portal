import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { InstagramPostsPage } from "@/components/lots/instagram-posts/InstagramPostsPage";
import { clienteRefQuery } from "./cliente.$cliente";

const publicacoesSearchSchema = z.object({
  ig: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/cliente/$cliente/publicacoes")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Publicações — ${params.cliente}`) }],
  }),
  validateSearch: publicacoesSearchSchema,
  component: ClientePublicacoesPage,
});

const authenticatedRoute = getRouteApi("/_authenticated");

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
  const { ig } = Route.useSearch();
  const { isAdmin } = authenticatedRoute.useRouteContext();

  if (!ref?.cadastroId) {
    return (
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <InstagramPostsPage
      cadastroClienteId={ref.cadastroId}
      clienteNome={ref.nome}
      clienteSlug={slug}
      isAdmin={isAdmin}
      openMediaId={ig}
    />
  );
}
