import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { LeadCentralWorkspace } from "@/components/lots/crm/LeadCentralWorkspace";
import { clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/leads")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Central de Leads — ${params.cliente}`) }],
  }),
  component: ClienteLeadsPage,
});

function ClienteLeadsPage() {
  const { cliente: slug } = Route.useParams();
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <ClienteLeadsResolved slug={slug} />
    </Suspense>
  );
}

function ClienteLeadsResolved({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref?.cadastroId) {
    return (
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <LeadCentralWorkspace
      cadastroClienteId={ref.cadastroId}
      clienteNome={ref.nome}
      clienteSlug={slug}
    />
  );
}
