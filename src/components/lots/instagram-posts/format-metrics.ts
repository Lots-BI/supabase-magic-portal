import type { IgMediaMetrics } from "@/modules/instagram-posts/types";

export function formatProductTypeLabel(type: string): string {
  switch (type.toUpperCase()) {
    case "REELS":
      return "Reels";
    case "STORY":
      return "Story";
    case "FEED":
      return "Feed";
    case "CAROUSEL":
      return "Carrossel";
    default:
      return type;
  }
}

const DISPLAY_CANDIDATES: Record<string, string[]> = {
  STORY: ["views", "reach", "replies", "link_clicks", "taps_forward", "taps_back", "exits"],
  REELS: [
    "views",
    "reach",
    "likes",
    "comments",
    "saves",
    "shares",
    "total_interactions",
    "ig_reels_avg_watch_time",
    "follows",
    "profile_visits",
  ],
  DEFAULT: [
    "views",
    "reach",
    "likes",
    "comments",
    "saves",
    "shares",
    "total_interactions",
    "follows",
    "profile_visits",
  ],
};

export function listAllDisplayMetrics(
  metrics: IgMediaMetrics,
  productType: string,
): Array<{ key: string; label: string; value: number }> {
  const normalized = productType.toUpperCase();
  const candidates =
    normalized === "STORY"
      ? DISPLAY_CANDIDATES.STORY
      : normalized === "REELS"
        ? DISPLAY_CANDIDATES.REELS
        : DISPLAY_CANDIDATES.DEFAULT;

  const picked = candidates
    .map((key) => {
      const value = metrics[key];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return {
        key,
        label: metricLabel(key),
        value,
      };
    })
    .filter((item): item is { key: string; label: string; value: number } => item !== null);

  const leftover = Object.keys(metrics)
    .filter((key) => !candidates.includes(key))
    .map((key) => {
      const value = metrics[key];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return { key, label: metricLabel(key), value };
    })
    .filter((item): item is { key: string; label: string; value: number } => item !== null);

  return [...picked, ...leftover];
}

export function pickDisplayMetrics(
  metrics: IgMediaMetrics,
  productType: string,
): Array<{ key: string; label: string; value: number }> {
  return listAllDisplayMetrics(metrics, productType).slice(0, 8);
}

export function metricLabel(key: string): string {
  const labels: Record<string, string> = {
    views: "Visualizações",
    reach: "Alcance",
    likes: "Curtidas",
    comments: "Comentários",
    saves: "Salvos",
    saved: "Salvos",
    shares: "Compartilhamentos",
    total_interactions: "Interações",
    replies: "Respostas",
    link_clicks: "Cliques no link",
    ig_reels_avg_watch_time: "Tempo médio de reprodução",
    ig_reels_video_view_total_time: "Tempo total de reprodução",
    follows: "Novos seguidores",
    profile_visits: "Visitas ao perfil",
    exits: "Saídas",
    taps_forward: "Toques para avançar",
    taps_back: "Toques para voltar",
    plays: "Reproduções",
    impressions: "Impressões",
    navigation: "Navegações",
    ig_reels_aggregated_all_plays_count: "Reproduções (todas)",
  };
  return labels[key] ?? key.replace(/_/g, " ");
}

export function formatMetricValue(key: string, value: number): string {
  if (
    key === "ig_reels_avg_watch_time" ||
    key.includes("watch_time") ||
    key.includes("view_total_time")
  ) {
    const seconds = value >= 1000 ? value / 1000 : value;
    return `${seconds.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
  }
  return value.toLocaleString("pt-BR");
}

export function engagementRate(metrics: IgMediaMetrics): number | null {
  const interactions = metrics.total_interactions;
  const denominator = metrics.views ?? metrics.reach;
  if (
    typeof interactions !== "number" ||
    typeof denominator !== "number" ||
    denominator <= 0
  ) {
    return null;
  }
  return (interactions / denominator) * 100;
}

export const POSTS_KPI_KEYS = [
  "publications",
  "views",
  "reach",
  "interactions",
  "likes",
  "saves",
  "shares",
  "comments",
] as const;

export type PostsKpiKey = (typeof POSTS_KPI_KEYS)[number];

export type PostsSummary = Record<PostsKpiKey, number>;

const METRIC_FOR_KPI: Record<Exclude<PostsKpiKey, "publications">, string> = {
  views: "views",
  reach: "reach",
  interactions: "total_interactions",
  likes: "likes",
  saves: "saves",
  shares: "shares",
  comments: "comments",
};

export const POSTS_KPI_LABELS: Record<PostsKpiKey, string> = {
  publications: "Publicações",
  views: "Visualizações",
  reach: "Alcance (soma)",
  interactions: "Interações",
  likes: "Curtidas",
  saves: "Salvos",
  shares: "Compartilhamentos",
  comments: "Comentários",
};

function sumMetric(posts: Array<{ metrics: IgMediaMetrics }>, key: string): number {
  return posts.reduce((sum, post) => {
    const value = post.metrics[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

/** Totais dos cards da aba Publicações (não das peças individuais). */
export function summarizePosts(posts: Array<{ metrics: IgMediaMetrics }>): PostsSummary {
  return {
    publications: posts.length,
    views: sumMetric(posts, METRIC_FOR_KPI.views),
    reach: sumMetric(posts, METRIC_FOR_KPI.reach),
    interactions: sumMetric(posts, METRIC_FOR_KPI.interactions),
    likes: sumMetric(posts, METRIC_FOR_KPI.likes),
    saves: sumMetric(posts, METRIC_FOR_KPI.saves),
    shares: sumMetric(posts, METRIC_FOR_KPI.shares),
    comments: sumMetric(posts, METRIC_FOR_KPI.comments),
  };
}
