import type { IgMediaMetrics } from "@/modules/instagram-posts/types";

export function formatProductTypeLabel(type: string): string {
  switch (type.toUpperCase()) {
    case "REELS":
      return "Reels";
    case "STORY":
      return "Story";
    case "FEED":
      return "Feed";
    default:
      return type;
  }
}

export function pickDisplayMetrics(metrics: IgMediaMetrics, productType: string): Array<{ key: string; label: string; value: number }> {
  const normalized = productType.toUpperCase();
  const candidates =
    normalized === "STORY"
      ? ["views", "reach", "replies", "link_clicks"]
      : ["views", "likes", "comments", "saves", "shares", "total_interactions"];

  return candidates
    .map((key) => {
      const value = metrics[key];
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return {
        key,
        label: metricLabel(key),
        value,
      };
    })
    .filter((item): item is { key: string; label: string; value: number } => item !== null)
    .slice(0, 4);
}

export function metricLabel(key: string): string {
  const labels: Record<string, string> = {
    views: "Views",
    reach: "Alcance",
    likes: "Curtidas",
    comments: "Comentários",
    saves: "Salvos",
    shares: "Compartilhamentos",
    total_interactions: "Interações",
    replies: "Respostas",
    link_clicks: "Cliques no link",
    ig_reels_avg_watch_time: "Tempo médio",
  };
  return labels[key] ?? key;
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
