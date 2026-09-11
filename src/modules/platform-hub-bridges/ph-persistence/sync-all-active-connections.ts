import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveConnectionSyncRow = {
  connectionId: string;
  cadastroId: number | null;
  label: string | null;
};

export type ActiveConnectionSyncResult<T extends { ok: boolean; error?: string }> =
  ActiveConnectionSyncRow & T;

export async function listActivePluginConnections(
  supabase: SupabaseClient,
  pluginKey: string,
): Promise<ActiveConnectionSyncRow[]> {
  const { data, error } = await supabase
    .from("ph_connections")
    .select("id, cadastro_id, label")
    .eq("plugin_key", pluginKey)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    connectionId: row.id as string,
    cadastroId: row.cadastro_id as number | null,
    label: row.label as string | null,
  }));
}

export type ConnectionMetricSyncResult = {
  ok: boolean;
  daysFilled?: number;
  daysRequested?: number;
  error?: string;
};

/** Patch de last_sync — não zera metrics_count num sucesso “já atualizado”. */
export function buildConnectionMetricSyncPatch(
  result: ConnectionMetricSyncResult,
): Record<string, unknown> {
  const now = new Date().toISOString();
  const hasWarning = Boolean(result.error);
  const patch: Record<string, unknown> = {
    last_sync_at: now,
    last_sync_status: result.ok ? (hasWarning ? "degraded" : "success") : "error",
    last_error: result.error ?? (result.ok ? null : "sync failed"),
    health_status: result.ok ? (hasWarning ? "degraded" : "healthy") : "unhealthy",
    updated_at: now,
  };
  if ((result.daysFilled ?? 0) > 0) {
    patch.metrics_count = result.daysFilled;
  }
  return patch;
}

export async function recordConnectionMetricSync(
  supabase: SupabaseClient,
  connectionId: string,
  result: ConnectionMetricSyncResult,
): Promise<void> {
  const { error } = await supabase
    .from("ph_connections")
    .update(buildConnectionMetricSyncPatch(result))
    .eq("id", connectionId);
  if (error) throw new Error(`ph_connections sync stamp failed: ${error.message}`);
}

export async function syncAllActivePluginConnections<T extends { ok: boolean; error?: string }>(
  supabase: SupabaseClient,
  pluginKey: string,
  syncOne: (connectionId: string) => Promise<T>,
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: ActiveConnectionSyncResult<T>[];
}> {
  const connections = await listActivePluginConnections(supabase, pluginKey);
  const results: ActiveConnectionSyncResult<T>[] = [];

  for (const connection of connections) {
    try {
      const sync = await syncOne(connection.connectionId);
      await recordConnectionMetricSync(supabase, connection.connectionId, sync);
      results.push({ ...connection, ...sync });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const failed = { ok: false, error } as T;
      try {
        await recordConnectionMetricSync(supabase, connection.connectionId, failed);
      } catch {
        // stamp best-effort
      }
      results.push({ ...connection, ...failed });
    }
  }

  const succeeded = results.filter((row) => row.ok).length;
  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}
