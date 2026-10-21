import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { MetaActionValueV1, MetaInsightRowV1 } from "./meta-api.types";
import { pickResultsValue } from "./meta-insights.mapper";

export type StructureLevel = "ad" | "adset";

export interface StructureKey {
  level: StructureLevel;
  boosted: boolean;
  campaign: string;
  adset: string;
  ad: string;
}

const PURCHASE_VALUE_TYPES = [
  "omni_purchase",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
] as const;

const MESSAGING_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.total_messaging_connection",
] as const;

function cleanName(value: string | undefined): string {
  return (value ?? "").replace(/[\t\r\n]/g, " ").trim().slice(0, 160);
}

export function structureCampaignKey(input: StructureKey): string {
  return [
    "nx",
    input.level,
    input.boosted ? "1" : "0",
    cleanName(input.campaign),
    cleanName(input.adset),
    cleanName(input.ad),
  ].join("\t");
}

export function parseStructureCampaignKey(raw: string): StructureKey | null {
  if (!raw.startsWith("nx\t")) return null;
  const parts = raw.split("\t");
  // Conjunto não tem nome de anúncio: o hub grava 5 campos, sem tab no fim.
  if (parts.length < 5) return null;
  const level = parts[1];
  if (level !== "ad" && level !== "adset") return null;
  return {
    level,
    boosted: parts[2] === "1",
    campaign: parts[3] ?? "",
    adset: parts[4] ?? "",
    ad: parts.slice(5).join(" "),
  };
}

function parseMetricValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function actionsByType(actions: readonly MetaActionValueV1[] | undefined): Map<string, number> {
  const byType = new Map<string, number>();
  for (const action of actions ?? []) {
    const type = action.action_type;
    const value = parseMetricValue(action.value);
    if (!type || value === null) continue;
    byType.set(type, (byType.get(type) ?? 0) + value);
  }
  return byType;
}

function firstPositive(byType: Map<string, number>, types: readonly string[]): number {
  for (const type of types) {
    const value = byType.get(type);
    if (value && value > 0) return value;
  }
  return 0;
}

function listTotal(list: readonly MetaActionValueV1[] | undefined): number {
  let total = 0;
  for (const item of list ?? []) {
    const value = parseMetricValue(item.value);
    if (value !== null && value > 0) total += value;
  }
  return total;
}

export interface HierarchyMetricBag {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  inline_link_clicks: number;
  results: number;
  instagram_profile_follows: number;
  instagram_profile_visits: number;
  outbound_clicks: number;
  video_thruplay: number;
  video_p25: number;
  video_p50: number;
  video_p75: number;
  video_p100: number;
  purchase_value: number;
  messaging_conversations_started: number;
}

function bagFromInsight(insight: MetaInsightRowV1, objective: string): HierarchyMetricBag {
  const byType = actionsByType(insight.actions);
  const values = actionsByType(insight.action_values);
  return {
    spend: parseMetricValue(insight.spend) ?? 0,
    impressions: parseMetricValue(insight.impressions) ?? 0,
    reach: parseMetricValue(insight.reach) ?? 0,
    clicks: parseMetricValue(insight.clicks) ?? 0,
    inline_link_clicks: parseMetricValue(insight.inline_link_clicks) ?? 0,
    results: pickResultsValue(insight, objective),
    instagram_profile_follows: parseMetricValue(insight.instagram_profile_follow) ?? 0,
    instagram_profile_visits: parseMetricValue(insight.instagram_profile_visits) ?? 0,
    outbound_clicks: listTotal(insight.outbound_clicks),
    video_thruplay: listTotal(insight.video_thruplay_watched_actions),
    video_p25: listTotal(insight.video_p25_watched_actions),
    video_p50: listTotal(insight.video_p50_watched_actions),
    video_p75: listTotal(insight.video_p75_watched_actions),
    video_p100: listTotal(insight.video_p100_watched_actions),
    purchase_value: firstPositive(values, PURCHASE_VALUE_TYPES),
    messaging_conversations_started: firstPositive(byType, MESSAGING_TYPES),
  };
}

const NX_KEYS: Array<[keyof HierarchyMetricBag, string]> = [
  ["spend", "nx_spend"],
  ["impressions", "nx_impressions"],
  ["reach", "nx_reach"],
  ["clicks", "nx_clicks"],
  ["inline_link_clicks", "nx_inline_link_clicks"],
  ["results", "nx_results"],
  ["instagram_profile_follows", "nx_instagram_follows"],
  ["instagram_profile_visits", "nx_instagram_visits"],
  ["outbound_clicks", "nx_outbound_clicks"],
  ["video_thruplay", "nx_video_thruplay"],
  ["video_p25", "nx_video_p25"],
  ["video_p50", "nx_video_p50"],
  ["video_p75", "nx_video_p75"],
  ["video_p100", "nx_video_p100"],
  ["purchase_value", "nx_purchase_value"],
  ["messaging_conversations_started", "nx_messaging"],
];

export interface MapHierarchyOptions {
  level: StructureLevel;
  campaignObjectives?: ReadonlyMap<string, string>;
  boostedAdIds?: ReadonlySet<string>;
}

function pushPositive(
  rows: MetricRowV1[],
  metricKey: string,
  value: number,
  date: string,
  campaign: string,
) {
  if (!Number.isFinite(value) || value <= 0) return;
  rows.push({ metricKey, value, date, campaign });
}

/**
 * Só linhas de conjunto/anúncio (prefixo nx). O dia da campanha continua
 * exclusivo da coleta level=campaign — somar o anúncio por cima troca o
 * número oficial no replace-by-day.
 */
export function mapMetaHierarchyInsights(
  insights: readonly MetaInsightRowV1[],
  options: MapHierarchyOptions,
): MetricRowV1[] {
  const rows: MetricRowV1[] = [];

  for (const insight of insights) {
    const date = insight.date_start;
    if (!date) continue;
    if (options.level === "ad" && !insight.ad_id && !insight.ad_name) continue;
    if (options.level === "adset" && !insight.adset_id && !insight.adset_name) continue;

    const campaignName = insight.campaign_name ?? insight.campaign_id ?? "";
    const objective =
      insight.campaign_id && options.campaignObjectives
        ? (options.campaignObjectives.get(insight.campaign_id) ?? "")
        : "";
    const bag = bagFromInsight(insight, objective);
    const boosted = Boolean(insight.ad_id && options.boostedAdIds?.has(insight.ad_id));
    const key = structureCampaignKey({
      level: options.level,
      boosted,
      campaign: campaignName,
      adset: insight.adset_name ?? insight.adset_id ?? "",
      ad: options.level === "ad" ? (insight.ad_name ?? insight.ad_id ?? "") : "",
    });

    for (const [field, metricKey] of NX_KEYS) {
      const value = bag[field];
      if (field === "spend") {
        rows.push({ metricKey, value, date, campaign: key });
        continue;
      }
      pushPositive(rows, metricKey, value, date, key);
    }
  }

  return rows;
}
