import { createFileRoute } from "@tanstack/react-router";
import { brandTitle } from "@/lib/brand";
import { ClientScopeProvider } from "@/modules/client/context";
import { ClientApprovalWorkspace } from "@/modules/client/components/ClientApprovalWorkspace";

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  head: () => ({ meta: [{ title: brandTitle("Aprovações") }] }),
  component: AprovacoesClientePage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function AprovacoesClientePage() {
  return (
    <ClientScopeProvider mode="client_access">
      <ClientApprovalWorkspace />
    </ClientScopeProvider>
  );
}
