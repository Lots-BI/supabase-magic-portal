import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { SupabaseCredentialVault } from "@/modules/platform-hub-bridges/ph-persistence/repositories/supabase-credential-vault";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { InstagramGraphClient } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client";
import { INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/instagram_organic/instagram-credential-keys";
import type { InstagramPublishTarget } from "./execute-instagram-publish";
import {
  selectPagePublishToken,
  type MetaManagedPage,
} from "./select-page-publish-token";

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

export type ResolvePublishTargetDeps = {
  fetchPages?: (userToken: string) => Promise<MetaManagedPage[]>;
  retrieveToken?: () => Promise<{ accessToken: string } | null>;
};

async function defaultFetchPages(userToken: string): Promise<MetaManagedPage[]> {
  const graph = new InstagramGraphClient({ httpClient: new FetchHttpClient() });
  return graph.listManagedPages(userToken);
}

export async function resolveInstagramPublishTarget(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  deps: ResolvePublishTargetDeps = {},
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

  const typed = (identities ?? []) as IdentityRow[];
  const igRows = typed.filter((row) => row.identity_type === "instagram");
  const pageRows = typed.filter((row) => row.identity_type === "page");
  const identity = igRows.find((row) => row.is_primary) ?? igRows[0];
  if (!identity?.external_id) {
    throw new InstagramPublishSetupError(
      "missing_connection",
      "A conexão Instagram não tem um perfil (identity) vinculado.",
    );
  }

  const token = deps.retrieveToken
    ? await deps.retrieveToken()
    : await createCredentialAccess(new SupabaseCredentialVault(supabase)).retrieveOAuthToken(
        asConnectionId(connection.id),
        INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
      );
  if (!token?.accessToken) {
    throw new InstagramPublishSetupError(
      "missing_publish_scope",
      "Reconecte o Instagram em Conexões com a conta Meta que gerencia o portfólio.",
    );
  }

  try {
    const pages = await (deps.fetchPages ?? defaultFetchPages)(token.accessToken);
    const selected = selectPagePublishToken(
      pages,
      identity.external_id,
      pageRows[0]?.external_id ?? null,
    );
    return { accessToken: selected.accessToken, igUserId: selected.igUserId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("missing_connection:") || message.startsWith("missing_publish_scope:")) {
      throw new InstagramPublishSetupError(
        message.startsWith("missing_connection:") ? "missing_connection" : "missing_publish_scope",
        message.replace(/^missing_(connection|publish_scope):\s*/, ""),
      );
    }
    if (/#10\b|#200\b|permission|instagram_content_publish/i.test(message)) {
      throw new InstagramPublishSetupError("missing_publish_scope", message);
    }
    throw new InstagramPublishSetupError(
      "missing_publish_scope",
      "Reconecte o Instagram em Conexões para obter o token da Página (pages_manage_posts).",
    );
  }
}
