import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import {
  acceptIgMediaEnvelope,
  isIgMediaSyncEnvelope,
} from "@/modules/platform-hub-bridges/ig-media/accept-ig-media-envelope";
import { INSTAGRAM_ORGANIC_METRICS_CAPABILITY } from "@/modules/platform-hub/plugins/instagram_organic/instagram_organic.capabilities";

export type InstagramMediaSyncResult = {
  connectionId: string;
  cadastroId: number | null;
  label: string | null;
  ok: boolean;
  mediaCount?: number;
  error?: string;
};

export async function syncInstagramMediaConnection(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<{ ok: boolean; mediaCount?: number; error?: string }> {
  const stack = await createAdminHubStack(supabase);
  const id = asConnectionId(connectionId);
  const identities = await stack.identityService.list(id);
  const provider = stack.registry.getPlugin("instagram_organic").adapter.getProvider("official_api");

  let envelope;
  try {
    envelope = await provider.collect({
      connectionId: id,
      capability: INSTAGRAM_ORGANIC_METRICS_CAPABILITY,
      identities,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao consultar o Instagram",
    };
  }

  if (!isIgMediaSyncEnvelope(envelope)) {
    return {
      ok: false,
      error: "A conexão Instagram não devolveu publicações. Reconecte a conta em Conexões.",
    };
  }

  const writeResult = await acceptIgMediaEnvelope(supabase, envelope);
  const mediaCount = writeResult?.mediaUpserted ?? 0;
  if (mediaCount === 0) {
    return {
      ok: false,
      error:
        "Nenhuma publicação veio da Meta. Confira se o Instagram Business está conectado e tente de novo.",
    };
  }
  return { ok: true, mediaCount };
}

export async function syncAllInstagramMediaConnections(
  supabase: SupabaseClient,
): Promise<{ total: number; succeeded: number; failed: number; results: InstagramMediaSyncResult[] }> {
  const { data: connections, error } = await supabase
    .from("ph_connections")
    .select("id, cadastro_id, label")
    .eq("plugin_key", "instagram_organic")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const results: InstagramMediaSyncResult[] = [];

  for (const connection of connections ?? []) {
    const base = {
      connectionId: connection.id,
      cadastroId: connection.cadastro_id as number | null,
      label: connection.label as string | null,
    };

    try {
      const sync = await syncInstagramMediaConnection(supabase, connection.id);
      results.push({ ...base, ...sync });
    } catch (err) {
      results.push({
        ...base,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}
