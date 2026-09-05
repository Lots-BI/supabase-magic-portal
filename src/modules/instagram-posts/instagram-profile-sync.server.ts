// ============================================================================
// Sync de PERFIL Instagram (conta/dia) — substituto do Make para
// vw_instagram_diario. Detecta dias faltantes no lookback da Meta (~90d) e
// preenche via Graph API, gravando em base_metricas_hub (MetricPipeline).
//
// Independente do sync de posts (/publicacoes) — não afeta ig_media nem
// desliga o Make. Ver plano "IG profile daily backfill".
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { isMetricsTimeseriesEnvelope } from "../../../contracts/ingest/ingest-envelope.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { INSTAGRAM_ORGANIC_PROFILE_CAPABILITY } from "@/modules/platform-hub/plugins/instagram_organic/instagram_organic.capabilities";
import {
  addDaysToDateStr,
  todayInSaoPaulo,
} from "@/modules/platform-hub/plugins/instagram_organic/api/date-utils";
import { groupIntoContiguousRanges, listMissingDates } from "./instagram-profile-gap-finder";

/** Meta expõe Insights de conta por ~90 dias (documentação oficial). */
export const INSTAGRAM_PROFILE_LOOKBACK_DAYS = 89;

/** Cap por execução — evita chamadas excessivas/timeout em um único clique. */
export const INSTAGRAM_PROFILE_MAX_DAYS_PER_RUN = 30;

const INSTAGRAM_PLATFORM_LABEL = "Instagram";

export interface InstagramProfileSyncResult {
  ok: boolean;
  daysFilled: number;
  daysRequested: number;
  from: string;
  to: string;
  error?: string;
}

async function fetchExistingInstagramDates(
  supabase: SupabaseClient,
  canonicalClientName: string,
  from: string,
  to: string,
): Promise<Set<string>> {
  const dates = new Set<string>();

  const { data: hubRows, error: hubError } = await supabase
    .from("base_metricas_hub")
    .select("data")
    .eq("cliente", canonicalClientName)
    .ilike("plataforma", "instagram")
    .gte("data", from)
    .lte("data", to);
  if (hubError) throw new Error(hubError.message);
  for (const row of hubRows ?? []) dates.add(String((row as { data: string }).data));

  const { data: aliasRows, error: aliasError } = await supabase
    .from("cliente_aliases")
    .select("alias_metricas")
    .eq("nome_canonico", canonicalClientName);
  if (aliasError) throw new Error(aliasError.message);
  const aliases = [
    canonicalClientName,
    ...(aliasRows ?? []).map((row) => String((row as { alias_metricas: string }).alias_metricas)),
  ];

  const { data: makeRows, error: makeError } = await supabase
    .from("base_metricas_make")
    .select("data")
    .in("cliente", aliases)
    .ilike("plataforma", "instagram")
    .gte("data", from)
    .lte("data", to);
  if (makeError) throw new Error(makeError.message);
  for (const row of makeRows ?? []) dates.add(String((row as { data: string }).data));

  return dates;
}

/**
 * Sincroniza o perfil Instagram de UMA conexão: detecta dias faltantes no
 * lookback (~90d) e coleta via Graph API, gravando em base_metricas_hub.
 */
export async function syncInstagramProfileConnection(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<InstagramProfileSyncResult> {
  // Insights de conta têm atraso de 24–48h — usamos "ontem" como fim do range.
  const to = addDaysToDateStr(todayInSaoPaulo(), -1);
  const from = addDaysToDateStr(to, -INSTAGRAM_PROFILE_LOOKBACK_DAYS);

  const stack = await createAdminHubStack(supabase);
  const id = asConnectionId(connectionId);

  const canonicalClientName = await stack.resolver.resolveCanonicalClientName(id);
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
  const existingDates = await fetchExistingInstagramDates(supabase, canonicalClientName, from, to);
  const missing = listMissingDates(from, to, existingDates);

  if (missing.length === 0) {
    return { ok: true, daysFilled: 0, daysRequested: 0, from, to };
  }

  // Prioriza os dias mais recentes; o restante é preenchido em próximos cliques.
  const capped = missing.slice(Math.max(0, missing.length - INSTAGRAM_PROFILE_MAX_DAYS_PER_RUN));
  const ranges = groupIntoContiguousRanges(capped);

  const provider = stack.registry
    .getPlugin("instagram_organic")
    .adapter.getProvider("official_api");

  let daysFilled = 0;
  const errors: string[] = [];

  for (const range of ranges) {
    try {
      const envelope = await provider.collect({
        connectionId: id,
        capability: INSTAGRAM_ORGANIC_PROFILE_CAPABILITY,
        identities,
        window: range,
      });

      if (!isMetricsTimeseriesEnvelope(envelope)) continue;

      envelope.payload.canonicalClientName = canonicalClientName;
      envelope.payload.platformLabel = envelope.payload.platformLabel || INSTAGRAM_PLATFORM_LABEL;

      await stack.metricPipeline.accept(envelope);
      daysFilled += new Set(envelope.payload.rows.map((row) => row.date)).size;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (daysFilled === 0 && errors.length > 0) {
    return {
      ok: false,
      daysFilled: 0,
      daysRequested: missing.length,
      from,
      to,
      error: errors.join("; "),
    };
  }

  return {
    ok: true,
    daysFilled,
    daysRequested: missing.length,
    from,
    to,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
