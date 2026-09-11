import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { SupabaseCredentialVault } from "@/modules/platform-hub-bridges/ph-persistence/repositories/supabase-credential-vault";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { InstagramGraphClient } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client";
import { INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/instagram_organic/instagram-credential-keys";
import { selectPagePublishToken } from "@/modules/approval/integrations/select-page-publish-token";

export type CrmInstagramTarget = {
  connectionId: string;
  accessToken: string;
  igUserId: string;
  cadastroClienteId: number;
};

export async function resolveCrmInstagramTarget(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<CrmInstagramTarget | { error: "missing_connection" | "missing_token"; detail: string }> {
  const { data: connections, error: connError } = await supabase
    .from("ph_connections")
    .select("id, status")
    .eq("cadastro_id", cadastroClienteId)
    .eq("plugin_key", "instagram_organic")
    .order("updated_at", { ascending: false })
    .limit(8);
  if (connError) throw new Error(connError.message);

  const rows = connections ?? [];
  const connection = rows.find((row) => row.status === "active") ?? rows[0];
  if (!connection) {
    return {
      error: "missing_connection",
      detail: "Conecte o Instagram deste cliente em Conexões.",
    };
  }

  const { data: identities, error: idError } = await supabase
    .from("ph_identities")
    .select("external_id, is_primary, identity_type")
    .eq("connection_id", connection.id);
  if (idError) throw new Error(idError.message);

  const igRows = (identities ?? []).filter((row) => row.identity_type === "instagram");
  const pageRows = (identities ?? []).filter((row) => row.identity_type === "page");
  const identity = igRows.find((row) => row.is_primary) ?? igRows[0];
  if (!identity?.external_id) {
    return { error: "missing_connection", detail: "A conexão Instagram não tem perfil vinculado." };
  }

  const token = await createCredentialAccess(new SupabaseCredentialVault(supabase)).retrieveOAuthToken(
    asConnectionId(connection.id),
    INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
  );
  if (!token?.accessToken) {
    return { error: "missing_token", detail: "Reconecte o Instagram em Conexões." };
  }

  try {
    const graph = new InstagramGraphClient({ httpClient: new FetchHttpClient() });
    const pages = await graph.listManagedPages(token.accessToken);
    const selected = selectPagePublishToken(
      pages,
      identity.external_id,
      pageRows[0]?.external_id ?? null,
    );
    return {
      connectionId: connection.id,
      accessToken: selected.accessToken,
      igUserId: selected.igUserId,
      cadastroClienteId,
    };
  } catch {
    return {
      connectionId: connection.id,
      accessToken: token.accessToken,
      igUserId: identity.external_id,
      cadastroClienteId,
    };
  }
}
