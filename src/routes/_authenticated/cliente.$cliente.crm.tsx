import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { CrmWorkspace } from "@/components/lots/crm/CrmWorkspace";
import { clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/crm")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`CRM — ${params.cliente}`) }],
  }),
  component: ClienteCrmPage,
});

function ClienteCrmPage() {
  const { cliente: slug } = Route.useParams();
  const { isAdmin } = Route.useRouteContext();
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <ClienteCrmResolved slug={slug} canWrite={isAdmin} />
    </Suspense>
  );
}

function ClienteCrmResolved({ slug, canWrite }: { slug: string; canWrite: boolean }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref?.cadastroId) {
    return (
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <CrmWorkspace
      cadastroClienteId={ref.cadastroId}
      clienteNome={ref.nome}
      clienteSlug={slug}
      canWrite={canWrite}
      connectionsHref={`/cliente/${slug}/conexoes`}
    />
  );
}
