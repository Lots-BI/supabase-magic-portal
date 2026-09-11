import type { SupabaseClient } from "@supabase/supabase-js";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { InstagramGraphClient } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client";
import { listActivePluginConnections } from "@/modules/platform-hub-bridges/ph-persistence/sync-all-active-connections";
import { mapGraphDmToSignal } from "./map-graph-dm";
import { persistCrmSignal } from "./persist-signal.server";
import { resolveCrmInstagramTarget } from "./resolve-crm-instagram-target.server";

const CONVERSATION_CAP = 25;

async function upsertCollector(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  status: "live" | "scope_missing" | "planned",
  detail: string,
) {
  const { error } = await supabase.from("crm_collector_state").upsert(
    {
      cadastro_cliente_id: cadastroClienteId,
      collector_key: "dm",
      status,
      detail,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cadastro_cliente_id,collector_key" },
  );
  if (error) throw new Error(error.message);
}

export type CrmDirectSyncResult = {
  ok: boolean;
  conversationsScanned: number;
  messagesFetched: number;
  peopleTouched: number;
  scopeMissing?: boolean;
  error?: string;
};

/**
 * Puxa Direct Instagram via Graph para o grafo CRM.
 * Sem ManyChat. Falha em silêncio se o token não tiver instagram_manage_messages.
 */
export async function syncCrmDirectForCadastro(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<CrmDirectSyncResult> {
  const target = await resolveCrmInstagramTarget(supabase, cadastroClienteId);
  if ("error" in target) {
    await upsertCollector(supabase, cadastroClienteId, "planned", target.detail);
    return {
      ok: true,
      conversationsScanned: 0,
      messagesFetched: 0,
      peopleTouched: 0,
      error: target.detail,
    };
  }

  const graph = new InstagramGraphClient({ httpClient: new FetchHttpClient() });
  const listed = await graph.listConversations(target.accessToken, target.igUserId);
  if (listed.unsupported) {
    await upsertCollector(
      supabase,
      cadastroClienteId,
      "scope_missing",
      "Direct Instagram — no App Dashboard ligue o caso de uso Mensagens e refaça o login. Sem ManyChat.",
    );
    return {
      ok: true,
      conversationsScanned: 0,
      messagesFetched: 0,
      peopleTouched: 0,
      scopeMissing: true,
      error: "scope_missing",
    };
  }

  const conversations = listed.items.slice(0, CONVERSATION_CAP);
  let messagesFetched = 0;
  const people = new Set<string>();

  for (const conversation of conversations) {
    if (!conversation.id) continue;
    const messages = await graph.listConversationMessages(target.accessToken, conversation.id);
    for (const message of messages) {
      const mapped = mapGraphDmToSignal({
        id: message.id,
        text: message.message,
        timestamp: message.created_time,
        from: message.from,
      });
      if (!mapped) continue;
      const kind = message.from?.id && message.from.id === target.igUserId ? "brand_reply" : mapped.signal.kind;
      const { personId } = await persistCrmSignal(
        supabase,
        cadastroClienteId,
        { ...mapped.signal, kind },
        mapped.identities,
        mapped.displayName,
      );
      people.add(personId);
      messagesFetched += 1;
    }
  }

  await upsertCollector(
    supabase,
    cadastroClienteId,
    "live",
    "Direct coletado pela Graph no Lots BI — sem ManyChat.",
  );

  return {
    ok: true,
    conversationsScanned: conversations.length,
    messagesFetched,
    peopleTouched: people.size,
  };
}

export async function syncAllCrmDirect(supabase: SupabaseClient) {
  const connections = await listActivePluginConnections(supabase, "instagram_organic");
  const seen = new Set<number>();
  const results: { cadastroClienteId: number | null; result: CrmDirectSyncResult }[] = [];
  for (const connection of connections) {
    if (connection.cadastroId == null || seen.has(connection.cadastroId)) continue;
    seen.add(connection.cadastroId);
    try {
      const result = await syncCrmDirectForCadastro(supabase, connection.cadastroId);
      results.push({ cadastroClienteId: connection.cadastroId, result });
    } catch (err) {
      results.push({
        cadastroClienteId: connection.cadastroId,
        result: {
          ok: false,
          conversationsScanned: 0,
          messagesFetched: 0,
          peopleTouched: 0,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
  const failed = results.filter((row) => !row.result.ok).length;
  return {
    total: results.length,
    succeeded: results.length - failed,
    failed,
    results,
  };
}
