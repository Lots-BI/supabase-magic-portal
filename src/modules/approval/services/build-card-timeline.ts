import type { ContentCardEvent, ContentCardEventType } from "../types/content-card-event";

export type TimelineEntry = {
  id: string;
  eventType: ContentCardEventType;
  actorEmail: string | null;
  message: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

const EVENT_LABELS: Record<ContentCardEventType, string> = {
  created: "criou o Card",
  updated: "atualizou o Card",
  commented: "comentou",
  moved: "moveu o Card",
  approval_requested: "enviou para aprovação",
  approved: "aprovou",
  changes_requested: "solicitou alteração",
  rejected: "reprovou",
  published: "publicou",
  archived: "arquivou",
  attachment_added: "adicionou anexo",
  attachment_removed: "removeu anexo",
  checklist_changed: "alterou checklist",
  publish_queued: "agendou publicação",
  publish_succeeded: "publicou no Instagram",
  publish_failed: "falhou ao publicar",
  material_submitted: "enviou material",
};

export function eventLabel(eventType: ContentCardEventType): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

/** Projeção cronológica da timeline (ordem ascendente para exibição). */
export function buildCardTimeline(events: ContentCardEvent[]): TimelineEntry[] {
  return [...events]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((e) => ({
      id: e.id,
      eventType: e.event_type,
      actorEmail: e.actor_email,
      message:
        typeof e.payload.mensagem === "string"
          ? e.payload.mensagem
          : typeof e.payload.message === "string"
            ? e.payload.message
            : null,
      createdAt: e.created_at,
      payload: e.payload,
    }));
}

export function formatTimelineSentence(entry: TimelineEntry): string {
  const who = entry.actorEmail?.split("@")[0] ?? "Alguém";
  return `${who} ${eventLabel(entry.eventType)}`;
}

/** Último pedido de alteração ainda sem reenvio/aprovação da agência. */
export function latestUnansweredChangeRequest(entries: TimelineEntry[]): TimelineEntry | null {
  let latest: TimelineEntry | null = null;
  for (const entry of entries) {
    if (entry.eventType === "changes_requested") latest = entry;
    if (entry.eventType === "approval_requested" || entry.eventType === "approved") {
      latest = null;
    }
  }
  return latest;
}
