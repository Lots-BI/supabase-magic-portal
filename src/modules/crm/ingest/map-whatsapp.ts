import { normalizeIdentityValue } from "../normalize-identity";
import type { CrmFieldFactInput, CrmIdentityInput, CrmSignalInput } from "../types";

export const CRM_SOURCE_WHATSAPP = "whatsapp_cloud";

export type WhatsappInbound = {
  messageId: string;
  waId: string;
  text?: string | null;
  timestamp?: string | null;
};

export function mapWhatsappInbound(message: WhatsappInbound): {
  signal: CrmSignalInput;
  identities: CrmIdentityInput[];
  facts: CrmFieldFactInput[];
  displayName: string;
} | null {
  const waId = normalizeIdentityValue("whatsapp", message.waId);
  if (!message.messageId || !waId) return null;
  const occurredAt = message.timestamp || new Date().toISOString();
  const identities: CrmIdentityInput[] = [
    { kind: "whatsapp", value: waId, source: CRM_SOURCE_WHATSAPP },
    { kind: "phone", value: waId, source: CRM_SOURCE_WHATSAPP },
  ];
  const facts: CrmFieldFactInput[] = [
    { field: "phone", value: waId, source: CRM_SOURCE_WHATSAPP, collectedAt: occurredAt },
  ];
  return {
    displayName: waId,
    identities,
    facts,
    signal: {
      kind: "whatsapp",
      place: "whatsapp",
      source: CRM_SOURCE_WHATSAPP,
      externalId: message.messageId,
      body: message.text ?? null,
      occurredAt,
      payload: { waId },
    },
  };
}
