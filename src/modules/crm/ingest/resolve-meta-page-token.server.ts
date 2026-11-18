import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { SupabaseCredentialVault } from "@/modules/platform-hub-bridges/ph-persistence/repositories/supabase-credential-vault";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { InstagramGraphClient } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client";
import { INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/instagram_organic/instagram-credential-keys";
import { META_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/meta_ads/meta-credential-keys";
import { MetaLeadSkipError } from "./meta-instant-form";

export type MetaPageAccess = {
  accessToken: string;
  pageId: string;
};

type PluginKey = "meta_ads" | "instagram_organic";

function credentialKey(plugin: PluginKey) {
  return plugin === "meta_ads" ? META_OAUTH_CREDENTIAL_KEY : INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY;
}

function rank(
  plugin: PluginKey,
  pageId: string | null,
  wantedPageId: string | null,
  hasLeads: boolean,
): number {
  const leadBoost = hasLeads ? 0 : 10;
  if (wantedPageId && pageId === wantedPageId && plugin === "meta_ads") return leadBoost;
  if (wantedPageId && pageId === wantedPageId) return leadBoost + 1;
  if (plugin === "meta_ads") return leadBoost + 2;
  return leadBoost + 3;
}

/**
 * Token da Página que administra o formulário instantâneo.
 * Prefere a conexão Meta Ads do cliente; cai para o Instagram se for a mesma Página.
 */
export async function resolveMetaPageAccessToken(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  pageId: string | null,
): Promise<MetaPageAccess> {
  const { data: connections, error } = await supabase
    .from("ph_connections")
    .select("id, plugin_key, status")
    .eq("cadastro_id", cadastroClienteId)
    .in("plugin_key", ["meta_ads", "instagram_organic"])
    .eq("status", "active");
  if (error) throw new Error(error.message);

  const rows = (connections ?? []).flatMap((row) => {
    if (row.plugin_key !== "meta_ads" && row.plugin_key !== "instagram_organic") return [];
    return [{ id: row.id as string, plugin: row.plugin_key as PluginKey }];
  });
  if (rows.length === 0) {
    throw new MetaLeadSkipError("Conecte Meta Ads ou o Instagram deste cliente em Conexões.");
  }

  const { data: identities, error: idError } = await supabase
    .from("ph_identities")
    .select("connection_id, external_id, identity_type")
    .in(
      "connection_id",
      rows.map((row) => row.id),
    );
  if (idError) throw new Error(idError.message);

  const pageByConnection = new Map<string, string>();
  for (const identity of identities ?? []) {
    if (identity.identity_type !== "page" || !identity.external_id) continue;
    if (!pageByConnection.has(identity.connection_id)) {
      pageByConnection.set(identity.connection_id, identity.external_id);
    }
  }

  const vault = createCredentialAccess(new SupabaseCredentialVault(supabase));
  const loaded = [];
  for (const connection of rows) {
    const userToken = await vault.retrieveOAuthToken(
      asConnectionId(connection.id),
      credentialKey(connection.plugin),
    );
    loaded.push({
      connection,
      userToken,
      hasLeads: userToken?.scopes?.includes("leads_retrieval") === true,
    });
  }
  loaded.sort(
    (a, b) =>
      rank(a.connection.plugin, pageByConnection.get(a.connection.id) ?? null, pageId, a.hasLeads) -
      rank(b.connection.plugin, pageByConnection.get(b.connection.id) ?? null, pageId, b.hasLeads),
  );

  const http = new FetchHttpClient();
  const graph = new InstagramGraphClient({ httpClient: http });
  let lastSkip = "Não achei o token da Página da Meta para ler o formulário.";

  for (const { connection, userToken } of loaded) {
    if (!userToken?.accessToken) {
      lastSkip = "Reconecte a conta Meta em Conexões para ler formulários instantâneos.";
      continue;
    }
    const wanted = pageId || pageByConnection.get(connection.id) || null;
    try {
      const pages = await graph.listManagedPages(userToken.accessToken);
      const match = wanted ? pages.find((page) => page.id === wanted) : pages[0];
      if (match?.access_token) {
        return { accessToken: match.access_token, pageId: match.id };
      }
      lastSkip = wanted
        ? "A Página desta campanha não está no token da conexão Meta."
        : "A conexão Meta não devolveu o token da Página.";
    } catch (error) {
      lastSkip =
        error instanceof Error ? error.message : "Não consegui listar as Páginas da conta Meta.";
    }
  }

  throw new MetaLeadSkipError(lastSkip);
}
