import type { IgMediaMetrics } from "@/modules/instagram-posts/types";
import type { InstagramMediaRowV1, InstagramInsightsResponseV1 } from "./instagram-api.types";

const FEED_CORE_METRICS = [
  "views",
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
] as const;

const FEED_EXTRA_METRICS = ["follows", "profile_visits"] as const;

const REELS_CORE_METRICS = [
  "views",
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "ig_reels_avg_watch_time",
] as const;

const REELS_EXTRA_METRICS = ["follows", "profile_visits"] as const;

const STORY_METRICS = [
  "views",
  "reach",
  "replies",
  "exits",
  "taps_forward",
  "taps_back",
  "link_clicks",
] as const;

function concatMetrics(
  core: readonly string[],
  extra: readonly string[],
): readonly string[] {
  return [...core, ...extra];
}

export function insightMetricsCoreForProductType(productType: string): readonly string[] {
  const normalized = productType.toUpperCase();
  if (normalized === "REELS") return REELS_CORE_METRICS;
  if (normalized === "STORY") return STORY_METRICS;
  return FEED_CORE_METRICS;
}

export function insightMetricsForProductType(productType: string): readonly string[] {
  const normalized = productType.toUpperCase();
  if (normalized === "REELS") return concatMetrics(REELS_CORE_METRICS, REELS_EXTRA_METRICS);
  if (normalized === "STORY") return STORY_METRICS;
  return concatMetrics(FEED_CORE_METRICS, FEED_EXTRA_METRICS);
}

function parseInsightValue(raw: number | undefined): number | undefined {
  if (raw === undefined || !Number.isFinite(raw)) return undefined;
  return raw;
}

export function mapInsightsToMetrics(
  body: InstagramInsightsResponseV1,
  media: InstagramMediaRowV1,
): IgMediaMetrics {
  const metrics: IgMediaMetrics = {};

  if (typeof media.like_count === "number") metrics.likes = media.like_count;
  if (typeof media.comments_count === "number") metrics.comments = media.comments_count;

  for (const item of body.data ?? []) {
    const value = parseInsightValue(item.values?.[0]?.value ?? item.value);
    if (value === undefined) continue;

    switch (item.name) {
      case "saved":
        metrics.saves = value;
        break;
      default:
        metrics[item.name] = value;
    }
  }

  return metrics;
}

export function mediaPublishedAt(media: InstagramMediaRowV1): string {
  if (media.timestamp) return media.timestamp;
  return new Date().toISOString();
}
