import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { brandTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { ClientScopeProvider } from "@/modules/client/context";
import { ClientApprovalWorkspace } from "@/modules/client/components/ClientApprovalWorkspace";
import { clienteRefQuery } from "./cliente.$cliente";

const aprovacoesSearchSchema = z.object({
  card: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/cliente/$cliente/aprovacoes")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Conteúdos — ${params.cliente}`) }],
  }),
  validateSearch: aprovacoesSearchSchema,
  component: ClienteAprovacoesPage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function ClienteAprovacoesPage() {
  const { cliente: slug } = Route.useParams();

  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={0} withChart={false} />}>
      <ClienteAprovacoesScoped slug={slug} />
    </Suspense>
  );
}

function ClienteAprovacoesScoped({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  const { card } = Route.useSearch();

  if (!ref?.cadastroId) {
    return (
      <div className="lots-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <ClientScopeProvider
      mode="slug_context"
      clienteSlug={slug}
      cadastroClienteId={ref.cadastroId}
      clienteNome={ref.nome}
    >
      <ClientApprovalWorkspace initialCardId={card} />
    </ClientScopeProvider>
  );
}
