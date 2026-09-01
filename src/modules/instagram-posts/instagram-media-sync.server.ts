import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import {
  acceptIgMediaEnvelope,
  isIgMediaSyncEnvelope,
} from "@/modules/platform-hub-bridges/ig-media/accept-ig-media-envelope";

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
  const result = await stack.manualScheduler.run(id);

  if (result.status !== "success" || !result.envelope) {
    return { ok: false, error: result.error ?? "Falha na sincronização" };
  }

  if (!isIgMediaSyncEnvelope(result.envelope)) {
    return { ok: false, error: "Envelope de sincronização inválido" };
  }

  const writeResult = await acceptIgMediaEnvelope(supabase, result.envelope);
  return { ok: true, mediaCount: writeResult?.mediaUpserted ?? 0 };
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
