import { brandTitle } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { RoteiroEditor } from "@/components/lots/approval/roteiro/RoteiroEditor";
import { ClientScopeProvider } from "@/modules/client/context";

export const Route = createFileRoute("/_authenticated/aprovacoes_/roteiro/$cardId")({
  head: () => ({ meta: [{ title: brandTitle("Roteiro") }] }),
  component: ClientRoteiroPage,
});

function ClientRoteiroPage() {
  const { cardId } = Route.useParams();
  return (
    <ClientScopeProvider mode="client_access">
      <RoteiroEditor cardId={cardId} mode="client" backTo="/aprovacoes" />
    </ClientScopeProvider>
  );
}
