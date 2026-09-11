import { normalizeIdentityValue, normalizeUsername } from "../normalize-identity";
import type { CrmIdentityInput, CrmSignalInput } from "../types";

export const CRM_SOURCE_DM = "instagram_dm";

export type CrmGraphDm = {
  id: string;
  text?: string | null;
  timestamp?: string | null;
  from?: { id?: string; username?: string } | null;
};

export function mapGraphDmToSignal(message: CrmGraphDm): {
  signal: CrmSignalInput;
  identities: CrmIdentityInput[];
  displayName: string;
} | null {
  const igsid = normalizeIdentityValue("igsid", message.from?.id);
  const username = normalizeUsername(message.from?.username);
  if (!message.id || (!igsid && !username)) return null;
  const identities: CrmIdentityInput[] = [];
  if (igsid) identities.push({ kind: "igsid", value: igsid, source: CRM_SOURCE_DM });
  if (username) identities.push({ kind: "ig_username", value: username, source: CRM_SOURCE_DM });
  return {
    displayName: username ? `@${username}` : "Direct",
    identities,
    signal: {
      kind: "dm",
      place: "unknown",
      source: CRM_SOURCE_DM,
      externalId: message.id,
      body: message.text ?? null,
      occurredAt: message.timestamp || new Date().toISOString(),
      payload: { igsid, username },
    },
  };
}
