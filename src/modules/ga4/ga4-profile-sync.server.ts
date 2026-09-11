import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { isMetricsTimeseriesEnvelope } from "../../../contracts/ingest/ingest-envelope.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { GA4_CAPABILITIES } from "@/modules/platform-hub/plugins/ga4/ga4.capabilities";
import {
  addDaysToDateStr,
  todayInSaoPaulo,
} from "@/modules/platform-hub/plugins/instagram_organic/api/date-utils";
import { groupIntoContiguousRanges, listMissingDates } from "@/modules/instagram-posts/instagram-profile-gap-finder";
import { syncAllActivePluginConnections } from "@/modules/platform-hub-bridges/ph-persistence/sync-all-active-connections";

export const GA4_LOOKBACK_DAYS = 89;
export const GA4_MAX_DAYS_PER_RUN = 89;
const GA4_REFRESH_DAYS = 3;
/** Label idêntico ao Make — a view prefer_hub também aceita 'GA4'. */
const GA4_MAKE_PLATFORM_LABEL = "Google Analytics 4";
const GA4_METRICS_CAPABILITY = GA4_CAPABILITIES[0];

export interface Ga4ProfileSyncResult {
  ok: boolean;
  daysFilled: number;
  daysRequested: number;
  from: string;
  to: string;
  error?: string;
}

async function fetchExistingGa4Dates(
  supabase: SupabaseClient,
  canonicalClientName: string,
  from: string,
  to: string,
): Promise<Set<string>> {
  const dates = new Set<string>();
  const { data, error } = await supabase
    .from("base_metricas_hub")
    .select("data, plataforma")
    .eq("cliente", canonicalClientName)
    .gte("data", from)
    .lte("data", to);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const plataforma = String((row as { plataforma: string }).plataforma).toLowerCase();
    if (plataforma === "ga4" || plataforma === "google analytics 4") {
      dates.add(String((row as { data: string }).data));
    }
  }
  return dates;
}

export async function syncGa4ProfileConnection(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<Ga4ProfileSyncResult> {
  const to = addDaysToDateStr(todayInSaoPaulo(), -1);
  const from = addDaysToDateStr(to, -GA4_LOOKBACK_DAYS);

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

  const identities = await stack.identityService.list(id);
  const existingDates = await fetchExistingGa4Dates(supabase, canonicalClientName, from, to);
  const missing = listMissingDates(from, to, existingDates);
  const refreshFrom = addDaysToDateStr(to, -(GA4_REFRESH_DAYS - 1));
  const refreshDays = listMissingDates(refreshFrom, to, new Set());
  const toFetch = [...new Set([...missing, ...refreshDays])].sort();

  if (toFetch.length === 0) {
    return { ok: true, daysFilled: 0, daysRequested: 0, from, to };
  }

  const capped = toFetch.slice(Math.max(0, toFetch.length - GA4_MAX_DAYS_PER_RUN));
  const ranges = groupIntoContiguousRanges(capped);
  const provider = stack.registry.getPlugin("ga4").adapter.getProvider("official_api");

  let daysFilled = 0;
  const errors: string[] = [];

  for (const range of ranges) {
    try {
      const envelope = await provider.collect({
        connectionId: id,
        capability: GA4_METRICS_CAPABILITY,
        identities,
        window: range,
      });
      if (!isMetricsTimeseriesEnvelope(envelope)) continue;
      if (envelope.payload.rows.length === 0) continue;

      envelope.payload.canonicalClientName = canonicalClientName;
      envelope.payload.platformLabel = GA4_MAKE_PLATFORM_LABEL;
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
      error:
        errors.length > 0
          ? errors.join("; ")
          : "O GA4 não devolveu métricas para o período. Confira a propriedade em Conexões.",
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

export async function syncAllGa4ProfileConnections(supabase: SupabaseClient) {
  return syncAllActivePluginConnections(supabase, "ga4", (connectionId) =>
    syncGa4ProfileConnection(supabase, connectionId),
  );
}
