export const CRM_SIGNAL_KINDS = [
  "comment",
  "reply",
  "dm",
  "story_reply",
  "lead_form",
  "whatsapp",
  "review",
  "mention",
  "brand_reply",
  "form",
  "email",
  "call",
  "other",
] as const;

export type CrmSignalKind = (typeof CRM_SIGNAL_KINDS)[number];

export const CRM_SIGNAL_PLACES = [
  "feed",
  "reels",
  "story",
  "ads",
  "whatsapp",
  "gbp",
  "youtube",
  "web",
  "phone",
  "unknown",
] as const;

export type CrmSignalPlace = (typeof CRM_SIGNAL_PLACES)[number];

export const CRM_IDENTITY_KINDS = [
  "igsid",
  "ig_username",
  "email",
  "phone",
  "whatsapp",
  "messenger_psid",
  "leadgen",
  "gbp_reviewer",
  "yt_channel",
] as const;

export type CrmIdentityKind = (typeof CRM_IDENTITY_KINDS)[number];

export const CRM_FIELD_KEYS = ["email", "phone", "address", "full_name"] as const;
export type CrmFieldKey = (typeof CRM_FIELD_KEYS)[number];

export const CRM_CHURN_STATES = [
  "novo",
  "recorrente",
  "em_risco",
  "dormindo",
  "reativado",
] as const;

export type CrmChurnState = (typeof CRM_CHURN_STATES)[number];

export const CRM_COLLECTOR_STATUSES = ["live", "scope_missing", "planned", "impossible"] as const;
export type CrmCollectorStatus = (typeof CRM_COLLECTOR_STATUSES)[number];

export const CRM_COLLECTOR_KEYS = [
  "comments",
  "dm",
  "lead_ads",
  "whatsapp",
  "ingest_api",
  "gbp_reviews",
  "likes",
] as const;

export type CrmCollectorKey = (typeof CRM_COLLECTOR_KEYS)[number];

export type CrmSignalPayload = {
  igMediaId?: string | null;
  permalink?: string | null;
  mediaProductType?: string | null;
  contentCardId?: string | null;
  pilarTitulo?: string | null;
  tema?: string | null;
  captionExcerpt?: string | null;
  username?: string | null;
  igsid?: string | null;
  hidden?: boolean;
};

export type CrmSignalInput = {
  kind: CrmSignalKind;
  place: CrmSignalPlace;
  source: string;
  externalId: string;
  body?: string | null;
  occurredAt: string;
  igMediaId?: string | null;
  contentCardId?: string | null;
  campaignKey?: string | null;
  payload?: CrmSignalPayload;
};

export type CrmIdentityInput = {
  kind: CrmIdentityKind;
  value: string;
  confidence?: number;
  source?: string;
};

export type CrmFieldFactInput = {
  field: CrmFieldKey;
  value: string;
  source: string;
  collectedAt: string;
};

export type CrmPersonStats = {
  signalCount: number;
  kindCounts: Partial<Record<CrmSignalKind, number>>;
  placeCounts: Partial<Record<CrmSignalPlace, number>>;
  mediaDistinct: number;
  cardDistinct: number;
  pillarAffinity: Record<string, number>;
  recencyDays: number;
  tenureDays: number;
  activeWeeks: number;
  streakWeeks: number;
  churnState: CrmChurnState;
  intentScore: number;
  piiCompleteness: number;
  heatScore: number;
  firstSignalAt: string | null;
  lastSignalAt: string | null;
};

export type CrmGraphComment = {
  id: string;
  text?: string | null;
  timestamp?: string | null;
  username?: string | null;
  hidden?: boolean;
  parent_id?: string | null;
  from?: { id?: string; username?: string } | null;
};

export const CRM_SOURCE_COMMENT = "instagram_comment";
export const CRM_SOURCE_REPLY = "instagram_comment_reply";
