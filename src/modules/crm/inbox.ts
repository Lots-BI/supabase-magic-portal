export const INBOUND_SIGNAL_KINDS = [
  "comment",
  "reply",
  "dm",
  "story_reply",
  "lead_form",
  "whatsapp",
  "review",
  "mention",
  "form",
  "email",
  "call",
  "other",
] as const;

export type CrmPeopleView = "inbox" | "churn" | "all";

export type InboxPersonInput = {
  ignoredAt: string | null;
  lastKind: string | null;
};

/** Caixa de entrada: último sinal da pessoa é inbound (ainda não respondido pela marca). */
export function isOpenInbox(person: InboxPersonInput): boolean {
  if (person.ignoredAt) return false;
  if (!person.lastKind) return false;
  return (INBOUND_SIGNAL_KINDS as readonly string[]).includes(person.lastKind);
}

export function isChurnQueue(churnState: string, ignoredAt: string | null): boolean {
  if (ignoredAt) return false;
  return churnState === "em_risco" || churnState === "dormindo";
}

/** @deprecated use isOpenInbox — alias estável para a lista. */
export const isInboxNow = isOpenInbox;
