import { createHash, randomBytes } from "node:crypto";

export function hashCrmIngestToken(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function generateCrmIngestToken(): {
  plaintext: string;
  prefix: string;
  hash: string;
} {
  const plaintext = `lots_crm_${randomBytes(32).toString("hex")}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 16),
    hash: hashCrmIngestToken(plaintext),
  };
}
