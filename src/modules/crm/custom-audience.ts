import { createHash } from "node:crypto";
import { normalizeIdentityValue } from "./normalize-identity";
import type { CrmFieldKey } from "./types";

export type AudienceFact = { field: string; value: string };

export type ConsentedAudience = {
  emailHashes: string[];
  phoneHashes: string[];
  refusedReason: string | null;
};

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hashFact(field: CrmFieldKey, value: string): string | null {
  const normalized = normalizeIdentityValue(field === "email" ? "email" : "phone", value);
  if (!normalized) return null;
  return sha256Hex(normalized);
}

/**
 * Custom Audience Meta: só e-mail/telefone consentidos.
 * Nunca hasheia IGSID, username ou texto de comentário.
 */
export function consentedAudienceHashes(facts: readonly AudienceFact[]): ConsentedAudience {
  const emailHashes: string[] = [];
  const phoneHashes: string[] = [];
  for (const fact of facts) {
    if (fact.field === "email") {
      const hash = hashFact("email", fact.value);
      if (hash) emailHashes.push(hash);
    } else if (fact.field === "phone") {
      const hash = hashFact("phone", fact.value);
      if (hash) phoneHashes.push(hash);
    }
  }
  const uniqueEmails = [...new Set(emailHashes)];
  const uniquePhones = [...new Set(phoneHashes)];
  if (uniqueEmails.length === 0 && uniquePhones.length === 0) {
    return {
      emailHashes: [],
      phoneHashes: [],
      refusedReason: "no_consented_facts",
    };
  }
  return { emailHashes: uniqueEmails, phoneHashes: uniquePhones, refusedReason: null };
}
