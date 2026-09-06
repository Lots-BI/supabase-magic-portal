import { adminTitle } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { PublishSchedulePanel } from "@/components/lots/approval/publish/PublishSchedulePanel";

export const Route = createFileRoute("/_authenticated/admin/aprovacoes_/agendar/$cardId")({
  head: () => ({ meta: [{ title: adminTitle("Agendar publicação") }] }),
  component: AdminAgendarPage,
});

function AdminAgendarPage() {
  const { cardId } = Route.useParams();
  return <PublishSchedulePanel cardId={cardId} backTo="/admin/aprovacoes" />;
}
