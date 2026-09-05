import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { InstagramAccountInsightsResponseV1 } from "./instagram-api.types";

/**
 * Métricas de conta/dia — nomes IDÊNTICOS ao Graph API (v22+) e ao que
 * `vw_instagram_diario` já espera em `metrica` (paridade Make).
 * Apenas `reach` suporta metric_type=time_series; as demais só total_value,
 * por isso coletamos dia a dia (ver instagram-graph-client.fetchAccountInsightsForDay).
 */
export const ACCOUNT_INSIGHTS_METRIC_KEYS = [
  "reach",
  "total_interactions",
  "accounts_engaged",
  "likes",
  "comments",
  "saves",
  "shares",
  "profile_links_taps",
] as const;

export const ACCOUNT_INSIGHTS_METRICS_PARAM = ACCOUNT_INSIGHTS_METRIC_KEYS.join(",");

const ALLOWED_METRIC_KEYS = new Set<string>(ACCOUNT_INSIGHTS_METRIC_KEYS);

/** Converte a resposta de Insights de conta (um dia) → MetricRowV1[] long format. */
export function mapAccountInsightsDayToMetricRows(
  response: InstagramAccountInsightsResponseV1,
  date: string,
): MetricRowV1[] {
  const rows: MetricRowV1[] = [];

  for (const item of response.data ?? []) {
    if (!ALLOWED_METRIC_KEYS.has(item.name)) continue;
    const value = item.total_value?.value;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    rows.push({ metricKey: item.name, value, date });
  }

  return rows;
}
