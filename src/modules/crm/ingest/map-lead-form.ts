import type { CrmFieldFactInput, CrmIdentityInput, CrmSignalInput } from "../types";
import {
  extractLeadFields,
  leadAnswersText,
  parseLeadCreatedAt,
  type LeadFieldInput,
} from "./meta-instant-form";

export const CRM_SOURCE_LEAD_ADS = "lead_ads";

export type LeadFormField = LeadFieldInput;

export type LeadFormPayload = {
  id: string;
  createdTime?: string | number | null;
  fieldData?: LeadFormField[] | null;
  campaignId?: string | null;
  campaignName?: string | null;
};

export function mapLeadForm(payload: LeadFormPayload): {
  signal: CrmSignalInput;
  identities: CrmIdentityInput[];
  facts: CrmFieldFactInput[];
  displayName: string;
} | null {
  if (!payload.id) return null;
  const extracted = extractLeadFields(payload.fieldData);
  const collectedAt = parseLeadCreatedAt(payload.createdTime);
  const identities: CrmIdentityInput[] = [
    { kind: "leadgen", value: payload.id, source: CRM_SOURCE_LEAD_ADS },
  ];
  const facts: CrmFieldFactInput[] = [];

  if (extracted.email) {
    facts.push({
      field: "email",
      value: extracted.email,
      source: CRM_SOURCE_LEAD_ADS,
      collectedAt,
    });
    identities.push({ kind: "email", value: extracted.email, source: CRM_SOURCE_LEAD_ADS });
  }
  if (extracted.telefone) {
    facts.push({
      field: "phone",
      value: extracted.telefone,
      source: CRM_SOURCE_LEAD_ADS,
      collectedAt,
    });
    identities.push({ kind: "phone", value: extracted.telefone, source: CRM_SOURCE_LEAD_ADS });
  }
  if (extracted.nome) {
    facts.push({
      field: "full_name",
      value: extracted.nome,
      source: CRM_SOURCE_LEAD_ADS,
      collectedAt,
    });
  }
  if (extracted.instagram) {
    identities.push({
      kind: "ig_username",
      value: extracted.instagram,
      source: CRM_SOURCE_LEAD_ADS,
    });
  }
  if (extracted.address) {
    facts.push({
      field: "address",
      value: extracted.address,
      source: CRM_SOURCE_LEAD_ADS,
      collectedAt,
    });
  }

  const campaignKey = payload.campaignId?.trim() || payload.campaignName?.trim() || null;

  return {
    displayName: extracted.nome ?? "Lead",
    identities,
    facts,
    signal: {
      kind: "lead_form",
      place: "ads",
      source: CRM_SOURCE_LEAD_ADS,
      externalId: payload.id,
      body: leadAnswersText(extracted),
      occurredAt: collectedAt,
      campaignKey,
      payload: { leadgen: payload.id },
    },
  };
}
