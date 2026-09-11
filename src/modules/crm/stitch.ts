import { normalizeIdentityValue, normalizeUsername } from "./normalize-identity";
import type { CrmIdentityInput, CrmIdentityKind } from "./types";

export type StitchPerson = {
  id: string;
  identities: CrmIdentityInput[];
};

export type StitchDecision =
  | { action: "match"; personId: string }
  | { action: "create"; identities: CrmIdentityInput[] };

function identityKey(kind: CrmIdentityKind, value: string): string {
  return `${kind}:${value}`;
}

export function resolvePersonStitch(input: {
  people: readonly StitchPerson[];
  igsid?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  incoming?: readonly CrmIdentityInput[];
}): StitchDecision {
  const igsid = normalizeIdentityValue("igsid", input.igsid);
  const username = normalizeUsername(input.username);
  const email = normalizeIdentityValue("email", input.email);
  const phone = normalizeIdentityValue("phone", input.phone);
  const whatsapp = normalizeIdentityValue("whatsapp", input.whatsapp);
  const incoming = (input.incoming ?? [])
    .map((ident) => {
      const value = normalizeIdentityValue(ident.kind, ident.value);
      return value ? { ...ident, value } : null;
    })
    .filter((ident): ident is CrmIdentityInput => Boolean(ident));

  if (!igsid && !username && !email && !phone && !whatsapp && incoming.length === 0) {
    throw new Error("stitch requires at least one identity");
  }

  const index = new Map<string, string>();
  for (const person of input.people) {
    for (const ident of person.identities) {
      const value = normalizeIdentityValue(ident.kind, ident.value);
      if (!value) continue;
      index.set(identityKey(ident.kind, value), person.id);
    }
  }

  const lookups: { kind: CrmIdentityKind; value: string }[] = [];
  if (igsid) lookups.push({ kind: "igsid", value: igsid });
  if (username) lookups.push({ kind: "ig_username", value: username });
  if (email) lookups.push({ kind: "email", value: email });
  if (phone) lookups.push({ kind: "phone", value: phone });
  if (whatsapp) lookups.push({ kind: "whatsapp", value: whatsapp });
  for (const ident of incoming) {
    if (!lookups.some((row) => row.kind === ident.kind && row.value === ident.value)) {
      lookups.push({ kind: ident.kind, value: ident.value });
    }
  }

  for (const lookup of lookups) {
    const match = index.get(identityKey(lookup.kind, lookup.value));
    if (match) return { action: "match", personId: match };
  }

  const identities: CrmIdentityInput[] = [];
  const push = (ident: CrmIdentityInput) => {
    if (identities.some((row) => row.kind === ident.kind && row.value === ident.value)) return;
    identities.push(ident);
  };
  if (igsid) push({ kind: "igsid", value: igsid, source: "instagram" });
  if (username) push({ kind: "ig_username", value: username, source: "instagram" });
  if (email) push({ kind: "email", value: email, source: "lead_ads" });
  if (phone) push({ kind: "phone", value: phone, source: "lead_ads" });
  if (whatsapp) push({ kind: "whatsapp", value: whatsapp, source: "whatsapp_cloud" });
  for (const ident of incoming) push(ident);
  return { action: "create", identities };
}
