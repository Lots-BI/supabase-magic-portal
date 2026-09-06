import { adminTitle } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { ProductionWorkspace } from "@/components/lots/approval/producao/ProductionWorkspace";

export const Route = createFileRoute("/_authenticated/admin/aprovacoes_/producao/$cardId")({
  head: () => ({ meta: [{ title: adminTitle("Produção") }] }),
  component: AdminProducaoPage,
});

function AdminProducaoPage() {
  const { cardId } = Route.useParams();
  return <ProductionWorkspace cardId={cardId} backTo="/admin/aprovacoes" />;
}
