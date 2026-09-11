// ============================================================================
// Sync de CAMPANHAS Meta Ads (campanha/dia) — substituto do Make para
// vw_meta_ads_diario. Detecta dias faltantes no lookback e preenche via
// Graph API (Marketing Insights), gravando em base_metricas_hub (MetricPipeline).
//
// Mesma receita do backfill de perfil Instagram (ver
// instagram-profile-sync.server.ts) — reaproveita o gap finder e os
// utilitários de data daquele módulo (lógica pura, sem acoplamento a
// Instagram). Diferença: a Insights API do Meta Ads aceita um range de dias
// em uma única chamada (time_increment=1), então cada intervalo contíguo
// faltante custa 1 chamada paginada, não 1 por dia.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { isMetricsTimeseriesEnvelope } from "../../../contracts/ingest/ingest-envelope.v1";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import {
  addDaysToDateStr,
  todayInSaoPaulo,
} from "@/modules/platform-hub/plugins/instagram_organic/api/date-utils";
import { META_ADS_CAPABILITIES } from "@/modules/platform-hub/plugins/meta_ads/meta_ads.capabilities";
import {
  groupIntoContiguousRanges,
  listMissingDates,
} from "@/modules/instagram-posts/instagram-profile-gap-finder";

/**
 * Lookback padrão para o primeiro backfill. Diferente do Instagram (limite
 * documentado da própria Meta em ~90 dias para account insights), a
 * Marketing Insights API do Meta Ads não tem esse teto — 90 dias é uma
 * escolha deliberada e ajustável (evita puxar anos de histórico de uma vez).
 */
export const META_ADS_LOOKBACK_DAYS = 89;

/** Cap por execução — evita chamadas excessivas/timeout em um único clique. */
export const META_ADS_MAX_DAYS_PER_RUN = 30;

const META_ADS_PLATFORM_LABEL = "Meta Ads";
const META_ADS_METRICS_CAPABILITY = META_ADS_CAPABILITIES[0];

export interface MetaAdsCampaignsSyncResult {
  ok: boolean;
  daysFilled: number;
  daysRequested: number;
  from: string;
  to: string;
  error?: string;
}

async function fetchExistingMetaAdsDates(
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
    .ilike("plataforma", "meta ads")
    .in("metrica", ["results", "conversions"])
    .gte("data", from)
    .lte("data", to);
  if (hubError) throw new Error(hubError.message);
  for (const row of hubRows ?? []) dates.add(String((row as { data: string }).data));

  // Make nunca gravou results/conversions — dias só no Make continuam "faltantes"
  // para o Hub preencher o contrato novo (prefer_hub substitui o dia inteiro).

  return dates;
}

/**
 * Sincroniza as campanhas Meta Ads de UMA conexão: detecta dias faltantes no
 * lookback e coleta via Marketing Insights API, gravando em base_metricas_hub.
 */
export async function syncMetaAdsCampaignsConnection(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<MetaAdsCampaignsSyncResult> {
  // Insights de anúncios têm atraso de atribuição — usamos "ontem" como fim do range.
  const to = addDaysToDateStr(todayInSaoPaulo(), -1);
  const from = addDaysToDateStr(to, -META_ADS_LOOKBACK_DAYS);

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
  const existingDates = await fetchExistingMetaAdsDates(supabase, canonicalClientName, from, to);
  const missing = listMissingDates(from, to, existingDates);

  if (missing.length === 0) {
    return { ok: true, daysFilled: 0, daysRequested: 0, from, to };
  }

  // Prioriza os dias mais recentes; o restante é preenchido em próximos cliques.
  const capped = missing.slice(Math.max(0, missing.length - META_ADS_MAX_DAYS_PER_RUN));
  const ranges = groupIntoContiguousRanges(capped);

  const provider = stack.registry.getPlugin("meta_ads").adapter.getProvider("official_api");

  let daysFilled = 0;
  const errors: string[] = [];

  for (const range of ranges) {
    try {
      const envelope = await provider.collect({
        connectionId: id,
        capability: META_ADS_METRICS_CAPABILITY,
        identities,
        window: range,
      });

      if (!isMetricsTimeseriesEnvelope(envelope)) continue;

      envelope.payload.canonicalClientName = canonicalClientName;
      envelope.payload.platformLabel = envelope.payload.platformLabel || META_ADS_PLATFORM_LABEL;

      await stack.metricPipeline.accept(envelope);
      daysFilled += new Set(envelope.payload.rows.map((row) => row.date)).size;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (daysFilled === 0 && missing.length > 0) {
    return {
      ok: false,
      daysFilled: 0,
      daysRequested: missing.length,
      from,
      to,
      error:
        errors.length > 0
          ? errors.join("; ")
          : "A Meta não devolveu campanhas para o período. Confira a conta de anúncios em Conexões.",
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
