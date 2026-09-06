import type { ContentCardEvent, ContentCardEventType } from "../types/content-card-event";
import type { ContentCardStatus } from "../types/content-card";

export type StageDuration = {
  fromStatus: ContentCardStatus | "start";
  toStatus: ContentCardStatus;
  durationMs: number;
};

const STATUS_FROM_EVENTS: Partial<Record<ContentCardEventType, ContentCardStatus>> = {
  approval_requested: "aguardando_aprovacao",
  approved: "aguardando_material",
  changes_requested: "roteiro",
  rejected: "roteiro",
  published: "publicado",
  archived: "arquivado",
  material_submitted: "producao",
  publish_queued: "agendado",
  publish_succeeded: "publicado",
};

function statusFromEvent(
  event: ContentCardEvent,
  payloadStatus?: string,
): ContentCardStatus | null {
  if (typeof payloadStatus === "string") {
    return payloadStatus as ContentCardStatus;
  }
  if (event.event_type === "moved" && typeof payloadStatus === "string") {
    return payloadStatus as ContentCardStatus;
  }
  const mapped = STATUS_FROM_EVENTS[event.event_type];
  if (mapped) return mapped;
  if (event.event_type === "created") return "roteiro";
  return null;
}

/** Calcula tempo entre mudanças de etapa a partir da timeline de eventos. */
export function computeStageDurations(events: ContentCardEvent[]): StageDuration[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const durations: StageDuration[] = [];
  let currentStatus: ContentCardStatus | "start" = "start";
  let lastAt = sorted[0]?.created_at ? new Date(sorted[0].created_at).getTime() : null;

  for (const event of sorted) {
    const payloadStatus =
      typeof event.payload.status_para === "string"
        ? event.payload.status_para
        : typeof event.payload.toStatus === "string"
          ? event.payload.toStatus
          : undefined;
    const next = statusFromEvent(event, payloadStatus);
    if (!next || lastAt === null) continue;
    const at = new Date(event.created_at).getTime();
    if (currentStatus !== next) {
      durations.push({
        fromStatus: currentStatus,
        toStatus: next,
        durationMs: at - lastAt,
      });
      currentStatus = next;
      lastAt = at;
    }
  }
  return durations;
}

export function averageStageDurationMs(durations: StageDuration[]): number | null {
  if (durations.length === 0) return null;
  const sum = durations.reduce((acc, d) => acc + d.durationMs, 0);
  return sum / durations.length;
}
