export const CONTENT_CARD_EVENT_TYPES = [
  "created",
  "updated",
  "commented",
  "moved",
  "approval_requested",
  "approved",
  "changes_requested",
  "rejected",
  "published",
  "archived",
  "attachment_added",
  "attachment_removed",
  "checklist_changed",
  "publish_queued",
  "publish_succeeded",
  "publish_failed",
  "material_submitted",
] as const;

export type ContentCardEventType = (typeof CONTENT_CARD_EVENT_TYPES)[number];

export type ContentCardEvent = {
  id: string;
  card_id: string;
  actor_id: string | null;
  actor_email: string | null;
  event_type: ContentCardEventType;
  payload: Record<string, unknown>;
  created_at: string;
};

export type ContentCardEventInsert = Omit<ContentCardEvent, "id" | "created_at"> & {
  id?: string;
};
