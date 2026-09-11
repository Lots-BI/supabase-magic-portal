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
}): StitchDecision {
  const igsid = normalizeIdentityValue("igsid", input.igsid);
  const username = normalizeUsername(input.username);
  const email = normalizeIdentityValue("email", input.email);
  const phone = normalizeIdentityValue("phone", input.phone);
  const whatsapp = normalizeIdentityValue("whatsapp", input.whatsapp);

  if (!igsid && !username && !email && !phone && !whatsapp) {
    throw new Error("stitch requires igsid, username, email, phone or whatsapp");
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

  for (const lookup of lookups) {
    const match = index.get(identityKey(lookup.kind, lookup.value));
    if (match) return { action: "match", personId: match };
  }

  const identities: CrmIdentityInput[] = [];
  if (igsid) identities.push({ kind: "igsid", value: igsid, source: "instagram" });
  if (username) identities.push({ kind: "ig_username", value: username, source: "instagram" });
  if (email) identities.push({ kind: "email", value: email, source: "lead_ads" });
  if (phone) identities.push({ kind: "phone", value: phone, source: "lead_ads" });
  if (whatsapp) identities.push({ kind: "whatsapp", value: whatsapp, source: "whatsapp_cloud" });
  return { action: "create", identities };
}
