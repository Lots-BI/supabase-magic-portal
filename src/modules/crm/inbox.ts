export const INBOX_WINDOW_MS = 48 * 60 * 60 * 1000;
export const INBOX_INTENT_MIN = 70;

export type CrmPeopleView = "all" | "inbox" | "churn";

export type InboxPersonInput = {
  ignoredAt: string | null;
  lastKind: string | null;
  lastSignalAt: string | null;
  intentScore: number;
  nextActionCode?: string | null;
};

const INBOX_KINDS = new Set(["comment", "reply", "dm", "lead_form", "whatsapp", "story_reply"]);

export function isInboxNow(person: InboxPersonInput, now = new Date()): boolean {
  if (person.ignoredAt) return false;
  if (
    person.nextActionCode === "reply_comment" ||
    person.nextActionCode === "reply_dm" ||
    person.nextActionCode === "open_whatsapp"
  ) {
    return true;
  }
  if (person.intentScore < INBOX_INTENT_MIN) return false;
  if (!person.lastKind || !INBOX_KINDS.has(person.lastKind)) return false;
  if (!person.lastSignalAt) return false;
  const last = new Date(person.lastSignalAt).getTime();
  if (!Number.isFinite(last)) return false;
  return now.getTime() - last <= INBOX_WINDOW_MS;
}

export function isChurnQueue(churnState: string, ignoredAt: string | null): boolean {
  if (ignoredAt) return false;
  return churnState === "em_risco" || churnState === "dormindo";
}
