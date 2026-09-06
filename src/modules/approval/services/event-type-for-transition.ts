import type { ContentCardEventType } from "../types/content-card-event";
import type { ContentCardStatus } from "../types/content-card";

export function eventTypeForTransition(
  from: ContentCardStatus,
  to: ContentCardStatus,
): ContentCardEventType {
  if (to === "arquivado") return "archived";
  if (to === "publicado") return "published";
  if (
    (to === "aguardando_aprovacao" || to === "aguardando_aprovacao_final") &&
    from !== to
  ) {
    return "approval_requested";
  }
  if (from === "aguardando_aprovacao" && to === "aguardando_material") return "approved";
  if (from === "aguardando_aprovacao_final" && to === "agendado") return "approved";
  if (
    (from === "aguardando_aprovacao" && to === "roteiro") ||
    (from === "aguardando_aprovacao_final" && to === "producao")
  ) {
    return "changes_requested";
  }
  return "moved";
}
