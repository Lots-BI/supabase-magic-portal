import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import {
  acceptIgMediaEnvelope,
  isIgMediaSyncEnvelope,
} from "@/modules/platform-hub-bridges/ig-media/accept-ig-media-envelope";
import { INSTAGRAM_ORGANIC_METRICS_CAPABILITY } from "@/modules/platform-hub/plugins/instagram_organic/instagram_organic.capabilities";
import { syncAllActivePluginConnections } from "@/modules/platform-hub-bridges/ph-persistence/sync-all-active-connections";

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
  return { ok: true, mediaCount: writeResult?.mediaUpserted ?? 0 };
}

export async function syncAllInstagramMediaConnections(supabase: SupabaseClient) {
  return syncAllActivePluginConnections(supabase, "instagram_organic", (connectionId) =>
    syncInstagramMediaConnection(supabase, connectionId),
  );
}
