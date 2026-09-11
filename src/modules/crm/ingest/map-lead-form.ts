import { normalizeIdentityValue } from "../normalize-identity";
import type { CrmFieldFactInput, CrmIdentityInput, CrmSignalInput } from "../types";

export const CRM_SOURCE_LEAD_ADS = "lead_ads";

const FIELD_MAP: Record<string, "email" | "phone" | "full_name" | "address"> = {
  email: "email",
  e_mail: "email",
  phone_number: "phone",
  phone: "phone",
  full_name: "full_name",
  first_name: "full_name",
  street_address: "address",
  city: "address",
};

export type LeadFormField = { name?: string | null; values?: string[] | null };

export type LeadFormPayload = {
  id: string;
  createdTime?: string | null;
  fieldData?: LeadFormField[];
};

export function mapLeadForm(payload: LeadFormPayload): {
  signal: CrmSignalInput;
  identities: CrmIdentityInput[];
  facts: CrmFieldFactInput[];
  displayName: string;
} | null {
  if (!payload.id) return null;
  const collectedAt = payload.createdTime || new Date().toISOString();
  const identities: CrmIdentityInput[] = [
    { kind: "leadgen", value: payload.id, source: CRM_SOURCE_LEAD_ADS },
  ];
  const facts: CrmFieldFactInput[] = [];
  let displayName = "Lead";

  for (const field of payload.fieldData ?? []) {
    const key = (field.name ?? "").trim().toLowerCase();
    const mapped = FIELD_MAP[key];
    const value = field.values?.[0]?.trim();
    if (!mapped || !value) continue;
    facts.push({ field: mapped, value, source: CRM_SOURCE_LEAD_ADS, collectedAt });
    if (mapped === "email") {
      const email = normalizeIdentityValue("email", value);
      if (email) identities.push({ kind: "email", value: email, source: CRM_SOURCE_LEAD_ADS });
    }
    if (mapped === "phone") {
      const phone = normalizeIdentityValue("phone", value);
      if (phone) identities.push({ kind: "phone", value: phone, source: CRM_SOURCE_LEAD_ADS });
    }
    if (mapped === "full_name") displayName = value;
  }

  return {
    displayName,
    identities,
    facts,
    signal: {
      kind: "lead_form",
      place: "ads",
      source: CRM_SOURCE_LEAD_ADS,
      externalId: payload.id,
      occurredAt: collectedAt,
      payload: { leadgen: payload.id },
    },
  };
}
