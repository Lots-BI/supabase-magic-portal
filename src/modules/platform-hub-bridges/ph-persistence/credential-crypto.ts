import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  CREDENTIAL_VAULT_CONTRACT_VERSION,
  type CredentialPayloadV1,
} from "../../../../contracts/credential/credential-vault.v1";

const ALGO = "aes-256-gcm";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function resolveSecret(): string {
  const secret =
    process.env.HUB_CREDENTIAL_ENCRYPTION_KEY?.trim() ||
    process.env.OFFICIAL_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("Missing HUB_CREDENTIAL_ENCRYPTION_KEY or OFFICIAL_SERVICE_ROLE_KEY");
  }
  return secret;
}

export function encryptCredentialPayload(payload: CredentialPayloadV1): string {
  const key = deriveKey(resolveSecret());
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptCredentialPayload(encoded: string): CredentialPayloadV1 {
  const key = deriveKey(resolveSecret());
  const buffer = Buffer.from(encoded, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  try {
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plaintext) as CredentialPayloadV1;
    return {
      version: parsed.version ?? CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { ...parsed.data },
    };
  } catch {
    throw new Error(
      "missing_publish_scope: Token Instagram não pôde ser lido neste ambiente. Refazer login em Conexões no mesmo ambiente (produção ou local) — a chave do cofre precisa ser a mesma.",
    );
  }
}
