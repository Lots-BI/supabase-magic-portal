import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { brandTitle } from "@/lib/brand";
import { ClientScopeProvider } from "@/modules/client/context";
import { ClientApprovalWorkspace } from "@/modules/client/components/ClientApprovalWorkspace";

const aprovacoesSearchSchema = z.object({
  card: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  head: () => ({ meta: [{ title: brandTitle("Conteúdos") }] }),
  validateSearch: aprovacoesSearchSchema,
  component: AprovacoesClientePage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function AprovacoesClientePage() {
  const { card } = Route.useSearch();
  return (
    <ClientScopeProvider mode="client_access">
      <ClientApprovalWorkspace initialCardId={card} />
    </ClientScopeProvider>
  );
}
