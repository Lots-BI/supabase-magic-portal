import type { ConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import {
  CREDENTIAL_VAULT_CONTRACT_VERSION,
  type CredentialKey,
  type CredentialPayloadV1,
  type CredentialVaultPortV1,
} from "../../../../../../contracts/credential/credential-vault.v1";

export interface OAuthTokenBundleV1 {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scopes?: readonly string[];
}

export function parseOAuthTokenBundle(
  payload: CredentialPayloadV1 | null,
): OAuthTokenBundleV1 | null {
  if (!payload) return null;
  const accessToken = payload.data.accessToken;
  if (typeof accessToken !== "string" || !accessToken) return null;
  return {
    accessToken,
    refreshToken:
      typeof payload.data.refreshToken === "string" ? payload.data.refreshToken : undefined,
    expiresAt: typeof payload.data.expiresAt === "string" ? payload.data.expiresAt : undefined,
    tokenType: typeof payload.data.tokenType === "string" ? payload.data.tokenType : undefined,
    scopes: Array.isArray(payload.data.scopes) ? (payload.data.scopes as string[]) : undefined,
  };
}

export function serializeOAuthTokenBundle(bundle: OAuthTokenBundleV1): CredentialPayloadV1["data"] {
  return {
    accessToken: bundle.accessToken,
    refreshToken: bundle.refreshToken,
    expiresAt: bundle.expiresAt,
    tokenType: bundle.tokenType ?? "Bearer",
    scopes: bundle.scopes,
  };
}

/** Acesso a credenciais desacoplado do Runtime — reutilizável por providers. */
export interface CredentialAccessPort {
  retrieveOAuthToken(
    connectionId: ConnectionId,
    key: CredentialKey,
  ): Promise<OAuthTokenBundleV1 | null>;
  storeOAuthToken(
    connectionId: ConnectionId,
    key: CredentialKey,
    bundle: OAuthTokenBundleV1,
  ): Promise<void>;
  deleteCredential(connectionId: ConnectionId, key: CredentialKey): Promise<void>;
}

export function createCredentialAccess(vault: CredentialVaultPortV1): CredentialAccessPort {
  return {
    async retrieveOAuthToken(connectionId, key) {
      const payload = await vault.retrieve(connectionId, key);
      return parseOAuthTokenBundle(payload);
    },
    async storeOAuthToken(connectionId, key, bundle) {
      await vault.store(connectionId, key, {
        version: CREDENTIAL_VAULT_CONTRACT_VERSION,
        data: serializeOAuthTokenBundle(bundle),
      });
      if (!bundle.expiresAt) return;
      try {
        const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
        await getSupabaseAdmin()
          .from("ph_connections")
          .update({ token_expires_at: bundle.expiresAt })
          .eq("id", String(connectionId));
      } catch {
        // A fila segue sem a data se o ambiente ainda não tem a coluna.
      }
    },
    async deleteCredential(connectionId, key) {
      await vault.delete(connectionId, key);
    },
  };
}
