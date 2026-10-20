import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { InstagramAccountInsightsResponseV1 } from "./instagram-api.types";

/**
 * Métricas de conta/dia — nomes IDÊNTICOS ao Graph API (v22+) e ao que
 * `vw_instagram_diario` já espera em `metrica` (paridade Make).
 * Apenas `reach` suporta metric_type=time_series; as demais só total_value,
 * por isso coletamos dia a dia (ver instagram-graph-client.fetchAccountInsightsForDay).
 */
export const ACCOUNT_INSIGHTS_CORE_KEYS = [
  "reach",
  "total_interactions",
  "accounts_engaged",
  "likes",
  "comments",
  "saves",
  "shares",
  "profile_links_taps",
] as const;

/** Pedidas à parte: contas/versões sem o field esvaziam a chamada inteira. */
export const ACCOUNT_INSIGHTS_EXTRA_KEYS = [
  "views",
  "replies",
  "website_clicks",
  "follows_and_unfollows",
] as const;

export const ACCOUNT_INSIGHTS_METRIC_KEYS = [
  ...ACCOUNT_INSIGHTS_CORE_KEYS,
  ...ACCOUNT_INSIGHTS_EXTRA_KEYS,
] as const;

export const ACCOUNT_INSIGHTS_METRICS_PARAM = ACCOUNT_INSIGHTS_METRIC_KEYS.join(",");
export const ACCOUNT_INSIGHTS_CORE_METRICS_PARAM = ACCOUNT_INSIGHTS_CORE_KEYS.join(",");

const METRIC_ALIASES: Record<string, string> = {
  follows_and_unfollows: "follows",
};

function followBreakdownKind(dimension: string): "gained" | "lost" | null {
  const value = dimension.trim().toUpperCase();
  if (value === "FOLLOWER" || value === "FOLLOW") return "gained";
  if (value === "NON_FOLLOWER" || value === "UNFOLLOW") return "lost";
  return null;
}

/**
 * `follows_and_unfollows` só devolve número com `breakdown=follow_type`.
 * FOLLOWER/FOLLOW = contas que passaram a seguir; NON_FOLLOWER/UNFOLLOW = deixaram de seguir.
 */
export function mapFollowBreakdownToMetricRows(
  response: InstagramAccountInsightsResponseV1,
  date: string,
): MetricRowV1[] {
  const rows: MetricRowV1[] = [];
  let gained = 0;
  let lost = 0;

  for (const item of response.data ?? []) {
    if (item.name !== "follows_and_unfollows") continue;
    for (const breakdown of item.total_value?.breakdowns ?? []) {
      for (const result of breakdown.results ?? []) {
        const kind = followBreakdownKind(result.dimension_values?.[0] ?? "");
        const value = result.value;
        if (!kind || typeof value !== "number" || !Number.isFinite(value)) continue;
        if (kind === "gained") gained += value;
        else lost += value;
      }
    }
  }

  if (gained > 0) rows.push({ metricKey: "follows", value: gained, date });
  if (lost > 0) rows.push({ metricKey: "unfollows", value: lost, date });
  return rows;
}

const ALLOWED_METRIC_KEYS = new Set<string>([
  ...ACCOUNT_INSIGHTS_CORE_KEYS,
  "views",
  "replies",
  "website_clicks",
  "follows",
  "follows_and_unfollows",
]);

/** Converte a resposta de Insights de conta (um dia) → MetricRowV1[] long format. */
export function mapAccountInsightsDayToMetricRows(
  response: InstagramAccountInsightsResponseV1,
  date: string,
): MetricRowV1[] {
  const rows: MetricRowV1[] = [];

  for (const item of response.data ?? []) {
    const mappedKey = METRIC_ALIASES[item.name] ?? item.name;
    if (!ALLOWED_METRIC_KEYS.has(item.name) && !ALLOWED_METRIC_KEYS.has(mappedKey)) continue;
    const value = item.total_value?.value;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    rows.push({ metricKey: mappedKey, value, date });
  }

  return rows;
}
