import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../contracts/ingest/ingest-envelope.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import {
  addDaysToDateStr,
  todayInSaoPaulo,
} from "@/modules/platform-hub/plugins/instagram_organic/api/date-utils";
import {
  groupIntoContiguousRanges,
  listMissingDates,
} from "@/modules/instagram-posts/instagram-profile-gap-finder";
import { syncAllActivePluginConnections } from "./sync-all-active-connections";

export interface OfficialPluginSyncResult {
  ok: boolean;
  daysFilled: number;
  daysRequested: number;
  from: string;
  to: string;
  error?: string;
}

export async function syncOfficialPluginConnection(
  supabase: SupabaseClient,
  connectionId: string,
  options: {
    pluginKey: string;
    capability: string;
    platformLabel: string;
    plataformaMatch: string;
    lookbackDays: number;
    maxDaysPerRun: number;
    refreshDays: number;
    emptyError: string;
  },
): Promise<OfficialPluginSyncResult> {
  const to = addDaysToDateStr(todayInSaoPaulo(), -1);
  const from = addDaysToDateStr(to, -options.lookbackDays);
  const stack = await createAdminHubStack(supabase);
  const id = asConnectionId(connectionId);

  let canonicalClientName: string;
  try {
    canonicalClientName = await stack.resolver.resolveCanonicalClientName(id);
  } catch (err) {
    return {
      ok: false,
      daysFilled: 0,
      daysRequested: 0,
      from,
      to,
      error: err instanceof Error ? err.message : "Cliente não resolvido para esta conexão",
    };
  }
  if (!canonicalClientName) {
    return {
      ok: false,
      daysFilled: 0,
      daysRequested: 0,
      from,
      to,
      error: "Cliente não resolvido para esta conexão",
    };
  }

  const dates = new Set<string>();
  const { data, error } = await supabase
    .from("base_metricas_hub")
    .select("data")
    .eq("cliente", canonicalClientName)
    .ilike("plataforma", options.plataformaMatch)
    .gte("data", from)
    .lte("data", to);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) dates.add(String((row as { data: string }).data));

  const missing = listMissingDates(from, to, dates);
  const refreshFrom = addDaysToDateStr(to, -(options.refreshDays - 1));
  const refreshDays = listMissingDates(refreshFrom, to, new Set());
  const toFetch = [...new Set([...missing, ...refreshDays])].sort();
  if (toFetch.length === 0) {
    return { ok: true, daysFilled: 0, daysRequested: 0, from, to };
  }

  const capped = toFetch.slice(Math.max(0, toFetch.length - options.maxDaysPerRun));
  const ranges = groupIntoContiguousRanges(capped);
  const provider = stack.registry
    .getPlugin(options.pluginKey as never)
    .adapter.getProvider("official_api");
  const identities = await stack.identityService.list(id);
  let daysFilled = 0;
  const errors: string[] = [];

  for (const range of ranges) {
    try {
      const envelope = await provider.collect({
        connectionId: id,
        capability: options.capability as never,
        identities,
        window: range,
      });
      if (!isMetricsTimeseriesEnvelope(envelope)) continue;
      if (envelope.payload.rows.length === 0) continue;
      envelope.payload.canonicalClientName = canonicalClientName;
      envelope.payload.platformLabel = options.platformLabel;
      await stack.metricPipeline.accept(envelope);
      daysFilled += new Set(envelope.payload.rows.map((row) => row.date)).size;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (daysFilled === 0 && toFetch.length > 0) {
    return {
      ok: false,
      daysFilled: 0,
      daysRequested: toFetch.length,
      from,
      to,
      error: errors.length > 0 ? errors.join("; ") : options.emptyError,
    };
  }

  return {
    ok: true,
    daysFilled,
    daysRequested: toFetch.length,
    from,
    to,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

export function syncAllOfficialPluginConnections(
  supabase: SupabaseClient,
  pluginKey: string,
  syncOne: (connectionId: string) => Promise<OfficialPluginSyncResult>,
) {
  return syncAllActivePluginConnections(supabase, pluginKey, syncOne);
}
