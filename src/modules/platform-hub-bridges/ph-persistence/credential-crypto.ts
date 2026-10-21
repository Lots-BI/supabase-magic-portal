import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  CREDENTIAL_VAULT_CONTRACT_VERSION,
  type CredentialPayloadV1,
} from "../../../../contracts/credential/credential-vault.v1";

const ALGO = "aes-256-gcm";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/** Dedicada primeiro; service role só se a Vercel ainda não tiver a chave do cofre. */
export function listVaultSecrets(): string[] {
  const secrets = [
    process.env.HUB_CREDENTIAL_ENCRYPTION_KEY?.trim(),
    process.env.OFFICIAL_SERVICE_ROLE_KEY?.trim(),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(secrets)];
}

function resolveEncryptSecret(): string {
  const secret = listVaultSecrets()[0];
  if (!secret) {
    throw new Error("Missing HUB_CREDENTIAL_ENCRYPTION_KEY");
  }
  return secret;
}

function decryptWithSecret(encoded: string, secret: string): CredentialPayloadV1 {
  const key = deriveKey(secret);
  const buffer = Buffer.from(encoded, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plaintext) as CredentialPayloadV1;
  return {
    version: parsed.version ?? CREDENTIAL_VAULT_CONTRACT_VERSION,
    data: { ...parsed.data },
  };
}

export function encryptCredentialPayload(payload: CredentialPayloadV1): string {
  const key = deriveKey(resolveEncryptSecret());
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptCredentialPayload(encoded: string): CredentialPayloadV1 {
  const secrets = listVaultSecrets();
  if (secrets.length === 0) {
    throw new Error("Missing HUB_CREDENTIAL_ENCRYPTION_KEY");
  }
  for (const secret of secrets) {
    try {
      return decryptWithSecret(encoded, secret);
    } catch {
      /* tenta a próxima chave (cofre dedicado vs service role antiga) */
    }
  }
  throw new Error(
    "missing_publish_scope: Token Instagram não pôde ser lido neste ambiente. Refazer login em Conexões no mesmo ambiente (produção ou local) — a chave do cofre precisa ser a mesma.",
  );
}
