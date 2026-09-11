import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { isMetricsTimeseriesEnvelope } from "../../../contracts/ingest/ingest-envelope.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import {
  addDaysToDateStr,
  todayInSaoPaulo,
} from "@/modules/platform-hub/plugins/instagram_organic/api/date-utils";
import { GOOGLE_ADS_CAPABILITIES } from "@/modules/platform-hub/plugins/google_ads/google_ads.capabilities";
import {
  groupIntoContiguousRanges,
  listMissingDates,
} from "@/modules/instagram-posts/instagram-profile-gap-finder";
import { syncAllActivePluginConnections } from "@/modules/platform-hub-bridges/ph-persistence/sync-all-active-connections";

export const GOOGLE_ADS_LOOKBACK_DAYS = 89;
export const GOOGLE_ADS_MAX_DAYS_PER_RUN = 89;
const GOOGLE_ADS_REFRESH_DAYS = 3;
const GOOGLE_ADS_PLATFORM_LABEL = "Google Ads";
const GOOGLE_ADS_METRICS_CAPABILITY = GOOGLE_ADS_CAPABILITIES[0];

export interface GoogleAdsCampaignsSyncResult {
  ok: boolean;
  daysFilled: number;
  daysRequested: number;
  from: string;
  to: string;
  error?: string;
}

async function fetchExistingGoogleAdsDates(
  supabase: SupabaseClient,
  canonicalClientName: string,
  from: string,
  to: string,
): Promise<Set<string>> {
  const dates = new Set<string>();
  const { data, error } = await supabase
    .from("base_metricas_hub")
    .select("data")
    .eq("cliente", canonicalClientName)
    .ilike("plataforma", "google ads")
    .gte("data", from)
    .lte("data", to);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) dates.add(String((row as { data: string }).data));
  return dates;
}

export async function syncGoogleAdsCampaignsConnection(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<GoogleAdsCampaignsSyncResult> {
  const to = addDaysToDateStr(todayInSaoPaulo(), -1);
  const from = addDaysToDateStr(to, -GOOGLE_ADS_LOOKBACK_DAYS);

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
  const existingDates = await fetchExistingGoogleAdsDates(supabase, canonicalClientName, from, to);
  const missing = listMissingDates(from, to, existingDates);
  const refreshFrom = addDaysToDateStr(to, -(GOOGLE_ADS_REFRESH_DAYS - 1));
  const refreshDays = listMissingDates(refreshFrom, to, new Set());
  const toFetch = [...new Set([...missing, ...refreshDays])].sort();

  if (toFetch.length === 0) {
    return { ok: true, daysFilled: 0, daysRequested: 0, from, to };
  }

  const capped = toFetch.slice(Math.max(0, toFetch.length - GOOGLE_ADS_MAX_DAYS_PER_RUN));
  const ranges = groupIntoContiguousRanges(capped);
  const provider = stack.registry.getPlugin("google_ads").adapter.getProvider("official_api");

  let daysFilled = 0;
  const errors: string[] = [];

  for (const range of ranges) {
    try {
      const envelope = await provider.collect({
        connectionId: id,
        capability: GOOGLE_ADS_METRICS_CAPABILITY,
        identities,
        window: range,
      });
      if (!isMetricsTimeseriesEnvelope(envelope)) continue;
      // Sem linhas: não gravar sentinela — senão prefer_hub esconde o Make.
      if (envelope.payload.rows.length === 0) continue;

      envelope.payload.canonicalClientName = canonicalClientName;
      envelope.payload.platformLabel = GOOGLE_ADS_PLATFORM_LABEL;
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
          : "O Google Ads não devolveu campanhas para o período. Confira a conexão e o developer token.",
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

export async function syncAllGoogleAdsCampaignsConnections(supabase: SupabaseClient) {
  return syncAllActivePluginConnections(supabase, "google_ads", (connectionId) =>
    syncGoogleAdsCampaignsConnection(supabase, connectionId),
  );
}
