import { adminTitle } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { RoteiroEditor } from "@/components/lots/approval/roteiro/RoteiroEditor";

export const Route = createFileRoute("/_authenticated/admin/aprovacoes_/roteiro/$cardId")({
  head: () => ({ meta: [{ title: adminTitle("Roteiro") }] }),
  component: AdminRoteiroPage,
});

function AdminRoteiroPage() {
  const { cardId } = Route.useParams();
  return <RoteiroEditor cardId={cardId} mode="admin" backTo="/admin/aprovacoes" />;
}
