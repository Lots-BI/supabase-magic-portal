import { createHmac, timingSafeEqual } from "node:crypto";

export type MetaWebhookQuery = {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
};

export type MetaWebhookEvent = {
  object: string;
  entryId: string;
  field: string;
  externalId: string;
  payload: Record<string, unknown>;
};

export function verifySubscribeQuery(
  query: MetaWebhookQuery,
  verifyToken: string | undefined,
): { ok: true; challenge: string } | { ok: false } {
  const token = verifyToken?.trim();
  const challenge = query["hub.challenge"];
  if (!token || !challenge) return { ok: false };
  if (query["hub.mode"] !== "subscribe") return { ok: false };
  if (query["hub.verify_token"] !== token) return { ok: false };
  return { ok: true, challenge };
}

export function verifyMetaSignature(
  rawBody: string,
  header: string | undefined,
  appSecret: string | undefined,
): boolean {
  const secret = appSecret?.trim();
  if (!secret || !header) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function eventId(field: string, value: Record<string, unknown>): string {
  const id = value.id ?? value.mid ?? value.leadgen_id ?? value.comment_id ?? value.message_id;
  if (typeof id === "string" && id) return id;
  return `${field}:${JSON.stringify(value).slice(0, 80)}`;
}

export function parseMetaWebhookBody(json: unknown): MetaWebhookEvent[] {
  const root = asRecord(json);
  if (!root) return [];
  const object = typeof root.object === "string" ? root.object : "unknown";
  const entries = Array.isArray(root.entry) ? root.entry : [];
  const events: MetaWebhookEvent[] = [];
  for (const entry of entries) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const entryId = typeof rec.id === "string" ? rec.id : "";
    const changes = Array.isArray(rec.changes) ? rec.changes : [];
    for (const change of changes) {
      const ch = asRecord(change);
      if (!ch) continue;
      const field = typeof ch.field === "string" ? ch.field : "unknown";
      const value = asRecord(ch.value) ?? {};
      events.push({
        object,
        entryId,
        field,
        externalId: eventId(field, value),
        payload: value,
      });
    }
    const messaging = Array.isArray(rec.messaging) ? rec.messaging : [];
    for (const msg of messaging) {
      const value = asRecord(msg) ?? {};
      const message = asRecord(value.message);
      const mid = typeof message?.mid === "string" ? message.mid : eventId("messages", value);
      events.push({
        object,
        entryId,
        field: "messages",
        externalId: mid,
        payload: value,
      });
    }
  }
  return events;
}
