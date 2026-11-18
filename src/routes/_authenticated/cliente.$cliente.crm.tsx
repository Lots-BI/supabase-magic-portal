import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { CrmWorkspace } from "@/components/lots/crm/CrmWorkspace";
import { clienteRefQuery } from "./cliente.$cliente";

const searchSchema = z.object({
  /** Abre a ficha desta pessoa ao carregar — usado pelo link "Abrir ficha no CRM" da Central de Leads. */
  pessoa: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/cliente/$cliente/crm")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`CRM — ${params.cliente}`) }],
  }),
  validateSearch: searchSchema,
  component: ClienteCrmPage,
});

function ClienteCrmPage() {
  const { cliente: slug } = Route.useParams();
  const { isAdmin } = Route.useRouteContext();
  const { pessoa } = Route.useSearch();
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <ClienteCrmResolved slug={slug} canWrite={isAdmin} initialPersonId={pessoa ?? null} />
    </Suspense>
  );
}

function ClienteCrmResolved({
  slug,
  canWrite,
  initialPersonId,
}: {
  slug: string;
  canWrite: boolean;
  initialPersonId: string | null;
}) {
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
      initialPersonId={initialPersonId}
    />
  );
}
