import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { SupabaseCredentialVault } from "@/modules/platform-hub-bridges/ph-persistence/repositories/supabase-credential-vault";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/instagram_organic/instagram-credential-keys";
import type { InstagramPublishTarget } from "./execute-instagram-publish";

export class InstagramPublishSetupError extends Error {
  constructor(
    readonly code: "missing_connection" | "missing_publish_scope",
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "InstagramPublishSetupError";
  }
}

type ConnectionRow = { id: string; status: string | null };
type IdentityRow = { external_id: string; is_primary: boolean; identity_type: string };

export async function resolveInstagramPublishTarget(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<InstagramPublishTarget> {
  const { data: connections, error: connError } = await supabase
    .from("ph_connections")
    .select("id, status")
    .eq("cadastro_id", cadastroClienteId)
    .eq("plugin_key", "instagram_organic")
    .order("updated_at", { ascending: false })
    .limit(8);
  if (connError) throw new Error(connError.message);

  const rows = (connections ?? []) as ConnectionRow[];
  const connection = rows.find((row) => row.status === "active") ?? rows[0];
  if (!connection) {
    throw new InstagramPublishSetupError(
      "missing_connection",
      "Conecte o Instagram deste cliente em Conexões antes de publicar.",
    );
  }

  const { data: identities, error: idError } = await supabase
    .from("ph_identities")
    .select("external_id, is_primary, identity_type")
    .eq("connection_id", connection.id);
  if (idError) throw new Error(idError.message);

  const igRows = ((identities ?? []) as IdentityRow[]).filter(
    (row) => row.identity_type === "instagram",
  );
  const identity = igRows.find((row) => row.is_primary) ?? igRows[0];
  if (!identity?.external_id) {
    throw new InstagramPublishSetupError(
      "missing_connection",
      "A conexão Instagram não tem um perfil (identity) vinculado.",
    );
  }

  const vault = new SupabaseCredentialVault(supabase);
  const access = createCredentialAccess(vault);
  const token = await access.retrieveOAuthToken(
    asConnectionId(connection.id),
    INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
  );
  if (!token?.accessToken) {
    throw new InstagramPublishSetupError(
      "missing_publish_scope",
      "Reconecte o Instagram do cliente com permissão de publicar (instagram_content_publish).",
    );
  }
  if (
    token.scopes &&
    token.scopes.length > 0 &&
    !token.scopes.includes("instagram_content_publish")
  ) {
    throw new InstagramPublishSetupError(
      "missing_publish_scope",
      "Reconecte o Instagram do cliente com permissão de publicar (instagram_content_publish).",
    );
  }

  return { accessToken: token.accessToken, igUserId: identity.external_id };
}
