import { normalizeIdentityValue, normalizeUsername } from "../normalize-identity";
import type {
  CrmFieldFactInput,
  CrmFieldKey,
  CrmIdentityInput,
  CrmIdentityKind,
  CrmSignalInput,
  CrmSignalKind,
  CrmSignalPlace,
} from "../types";
import { CRM_FIELD_KEYS, CRM_IDENTITY_KINDS } from "../types";

export const CRM_INGEST_CHANNELS = [
  "whatsapp",
  "instagram_dm",
  "instagram_comment",
  "messenger",
  "lead_form",
  "form",
  "email",
  "call",
  "review",
  "mention",
  "other",
] as const;

export type CrmIngestChannel = (typeof CRM_INGEST_CHANNELS)[number];

export type CrmIngestIdentity = { kind: string; value: string };
export type CrmIngestFact = { field: string; value: string };

export type CrmIngestInteraction = {
  channel: CrmIngestChannel;
  externalId: string;
  occurredAt?: string | null;
  body?: string | null;
  displayName?: string | null;
  campaignKey?: string | null;
  direction?: "inbound" | "outbound";
  identities: CrmIngestIdentity[];
  facts?: CrmIngestFact[];
};

export type MappedIngest = {
  signal: CrmSignalInput;
  identities: CrmIdentityInput[];
  facts: CrmFieldFactInput[];
  displayName: string;
};

const CHANNEL_KIND: Record<CrmIngestChannel, CrmSignalKind> = {
  whatsapp: "whatsapp",
  instagram_dm: "dm",
  instagram_comment: "comment",
  messenger: "dm",
  lead_form: "lead_form",
  form: "form",
  email: "email",
  call: "call",
  review: "review",
  mention: "mention",
  other: "other",
};

const CHANNEL_PLACE: Record<CrmIngestChannel, CrmSignalPlace> = {
  whatsapp: "whatsapp",
  instagram_dm: "unknown",
  instagram_comment: "feed",
  messenger: "unknown",
  lead_form: "ads",
  form: "web",
  email: "web",
  call: "phone",
  review: "gbp",
  mention: "unknown",
  other: "unknown",
};

const CHANNELS = new Set<string>(CRM_INGEST_CHANNELS);

function isIdentityKind(kind: string): kind is CrmIdentityKind {
  return (CRM_IDENTITY_KINDS as readonly string[]).includes(kind);
}

function isFieldKey(field: string): field is CrmFieldKey {
  return (CRM_FIELD_KEYS as readonly string[]).includes(field);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const raw = obj[key];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (value) return value;
  }
  return null;
}

function parseIdentities(raw: unknown): CrmIngestIdentity[] {
  if (!Array.isArray(raw)) return [];
  const out: CrmIngestIdentity[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!rec) continue;
    const kind = pickString(rec, "kind");
    const value = pickString(rec, "value");
    if (!kind || !value) continue;
    out.push({ kind, value });
  }
  return out;
}

function parseFacts(raw: unknown): CrmIngestFact[] {
  if (!Array.isArray(raw)) return [];
  const out: CrmIngestFact[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!rec) continue;
    const field = pickString(rec, "field");
    const value = pickString(rec, "value");
    if (!field || !value) continue;
    out.push({ field, value });
  }
  return out;
}

function parseOneEvent(raw: unknown): CrmIngestInteraction | { error: string } {
  const rec = asRecord(raw);
  if (!rec) return { error: "Cada evento precisa ser um objeto JSON." };
  const channel = pickString(rec, "channel");
  if (!channel || !CHANNELS.has(channel)) {
    return { error: `channel inválido. Use: ${CRM_INGEST_CHANNELS.join(", ")}.` };
  }
  const externalId = pickString(rec, "external_id", "externalId");
  if (!externalId) return { error: "external_id é obrigatório." };
  const directionRaw = pickString(rec, "direction");
  const direction =
    directionRaw === "outbound" ? "outbound" : directionRaw === "inbound" ? "inbound" : undefined;
  return {
    channel: channel as CrmIngestChannel,
    externalId,
    occurredAt: pickString(rec, "occurred_at", "occurredAt"),
    body: pickString(rec, "body"),
    displayName: pickString(rec, "display_name", "displayName"),
    campaignKey: pickString(rec, "campaign_key", "campaignKey"),
    direction,
    identities: parseIdentities(rec.identities),
    facts: parseFacts(rec.facts),
  };
}

/** Aceita um evento ou `{ events: [...] }` (máx. 50). */
export function parseIngestEvents(
  body: unknown,
): { events: CrmIngestInteraction[] } | { error: string } {
  if (Array.isArray(body)) return parseIngestEvents({ events: body });
  const rec = asRecord(body);
  if (!rec) return { error: "JSON inválido." };
  if (!rec) return { error: "JSON inválido." };
  const rawEvents = Array.isArray(rec.events) ? rec.events : [rec];
  if (rawEvents.length === 0) return { error: "Nenhum evento." };
  if (rawEvents.length > 50) return { error: "Máximo 50 eventos por request." };
  const events: CrmIngestInteraction[] = [];
  for (const item of rawEvents) {
    const parsed = parseOneEvent(item);
    if ("error" in parsed) return parsed;
    events.push(parsed);
  }
  return { events };
}

function pushIdentity(list: CrmIdentityInput[], ident: CrmIdentityInput) {
  if (list.some((row) => row.kind === ident.kind && row.value === ident.value)) return;
  list.push(ident);
}

/**
 * Mapeia um evento externo (n8n, ManyChat, Typeform, site) para o grafo CRM.
 * Não lê e-mail/telefone do texto — só de `identities` e `facts`.
 */
export function mapIngestInteraction(
  input: CrmIngestInteraction,
): MappedIngest | { error: string } {
  const externalId = input.externalId.trim();
  if (!externalId) return { error: "external_id é obrigatório." };

  const source = `ingest_api:${input.channel}`;
  const identities: CrmIdentityInput[] = [];
  for (const raw of input.identities) {
    if (!isIdentityKind(raw.kind)) continue;
    const value = normalizeIdentityValue(raw.kind, raw.value);
    if (!value) continue;
    pushIdentity(identities, { kind: raw.kind, value, source });
  }

  const collectedAt = input.occurredAt?.trim() || new Date().toISOString();
  const facts: CrmFieldFactInput[] = [];
  for (const raw of input.facts ?? []) {
    if (!isFieldKey(raw.field)) continue;
    const value = raw.value.trim();
    if (!value) continue;
    facts.push({ field: raw.field, value, source, collectedAt });
    if (raw.field === "email") {
      const email = normalizeIdentityValue("email", value);
      if (email) pushIdentity(identities, { kind: "email", value: email, source });
    }
    if (raw.field === "phone") {
      const phone = normalizeIdentityValue("phone", value);
      if (phone) pushIdentity(identities, { kind: "phone", value: phone, source });
    }
  }

  const whatsapp = identities.find((i) => i.kind === "whatsapp")?.value;
  const phone = identities.find((i) => i.kind === "phone")?.value;
  if (whatsapp) pushIdentity(identities, { kind: "phone", value: whatsapp, source });
  if (input.channel === "whatsapp" && phone) {
    pushIdentity(identities, { kind: "whatsapp", value: phone, source });
  }

  if (identities.length === 0) {
    return { error: "Informe pelo menos uma identidade (phone, whatsapp, email, ig_username…)." };
  }

  const username = identities.find((i) => i.kind === "ig_username")?.value;
  const displayName =
    input.displayName?.trim() ||
    facts.find((f) => f.field === "full_name")?.value ||
    (username ? `@${username}` : identities[0]!.value);

  const kind: CrmSignalKind =
    input.direction === "outbound" ? "brand_reply" : CHANNEL_KIND[input.channel];

  return {
    displayName,
    identities,
    facts,
    signal: {
      kind,
      place: CHANNEL_PLACE[input.channel],
      source,
      externalId,
      body: input.body?.trim() ? input.body.trim() : null,
      occurredAt: collectedAt,
      campaignKey: input.campaignKey ?? null,
      payload: {
        username: username ?? normalizeUsername(displayName),
      },
    },
  };
}
