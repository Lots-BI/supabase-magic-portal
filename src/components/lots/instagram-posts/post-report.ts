import { pctDelta } from "@/lib/platforms/engine";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import {
  engagementRate,
  formatProductTypeLabel,
  listAllDisplayMetrics,
  metricLabel,
} from "./format-metrics";

export type PerformanceBand = "strong" | "above" | "inline" | "below" | "weak" | "no_baseline";

export interface MetricComparison {
  key: string;
  label: string;
  value: number;
  average: number | null;
  sampleSize: number;
  deltaPct: number | null;
  band: PerformanceBand;
  rank: number | null;
  cohortSize: number;
  lowerIsBetter: boolean;
}

export interface PostReport {
  productLabel: string;
  cohortLabel: string;
  sampleSize: number;
  engagementRate: number | null;
  cohortEngagementAvg: number | null;
  comparisons: MetricComparison[];
  chartComparisons: MetricComparison[];
  mix: Array<{ key: string; label: string; value: number }>;
  strengths: MetricComparison[];
  weaknesses: MetricComparison[];
  headline: string;
  bullets: string[];
}

const LOWER_IS_BETTER = new Set(["exits"]);

const CHART_KEYS = new Set([
  "views",
  "reach",
  "total_interactions",
  "likes",
  "comments",
  "saves",
  "shares",
  "follows",
  "profile_visits",
  "replies",
  "link_clicks",
]);

const MIX_KEYS = ["likes", "comments", "saves", "shares", "replies"] as const;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function bandFor(deltaPct: number | null, lowerIsBetter: boolean): PerformanceBand {
  if (deltaPct == null) return "no_baseline";
  const signed = lowerIsBetter ? -deltaPct : deltaPct;
  if (signed >= 25) return "strong";
  if (signed >= 8) return "above";
  if (signed <= -25) return "weak";
  if (signed <= -8) return "below";
  return "inline";
}

export function bandLabel(band: PerformanceBand): string {
  switch (band) {
    case "strong":
      return "Bem acima da média";
    case "above":
      return "Acima da média";
    case "inline":
      return "Na média";
    case "below":
      return "Abaixo da média";
    case "weak":
      return "Bem abaixo da média";
    default:
      return "Sem base";
  }
}

function chooseCohort(
  post: IgMediaRow,
  posts: readonly IgMediaRow[],
): { peers: IgMediaRow[]; label: string } {
  const others = posts.filter((row) => row.id !== post.id);
  const sameType = others.filter((row) => row.media_product_type === post.media_product_type);
  const typeLabel = formatProductTypeLabel(post.media_product_type);
  if (sameType.length >= 2) {
    return { peers: sameType, label: `outras ${sameType.length} publicações de ${typeLabel}` };
  }
  if (others.length >= 1) {
    return {
      peers: others,
      label: `outras ${others.length} publicações do período`,
    };
  }
  return { peers: [], label: "sem outras publicações neste recorte" };
}

function rankAmong(
  value: number,
  peerValues: number[],
  lowerIsBetter: boolean,
): { rank: number; cohortSize: number } {
  const all = [...peerValues, value].sort((a, b) => (lowerIsBetter ? a - b : b - a));
  const rank = all.findIndex((n) => n === value) + 1;
  return { rank, cohortSize: all.length };
}

export function buildPostReport(post: IgMediaRow, posts: readonly IgMediaRow[]): PostReport {
  const productLabel = formatProductTypeLabel(post.media_product_type);
  const { peers, label: cohortLabel } = chooseCohort(post, posts);
  const listed = listAllDisplayMetrics(post.metrics, post.media_product_type);
  const engagement = engagementRate(post.metrics);
  const peerEngagements = peers
    .map((row) => engagementRate(row.metrics))
    .filter((n): n is number => n != null);
  const cohortEngagementAvg = average(peerEngagements);

  const comparisons: MetricComparison[] = listed.map((item) => {
    const lowerIsBetter = LOWER_IS_BETTER.has(item.key);
    const peerValues = peers
      .map((row) => row.metrics[item.key])
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    const avg = average(peerValues);
    const deltaPct = avg == null ? null : pctDelta(item.value, avg);
    const { rank, cohortSize } = rankAmong(item.value, peerValues, lowerIsBetter);
    return {
      key: item.key,
      label: item.label,
      value: item.value,
      average: avg,
      sampleSize: peerValues.length,
      deltaPct,
      band: bandFor(deltaPct, lowerIsBetter),
      rank: peerValues.length > 0 ? rank : null,
      cohortSize,
      lowerIsBetter,
    };
  });

  if (engagement != null) {
    const deltaPct = cohortEngagementAvg == null ? null : pctDelta(engagement, cohortEngagementAvg);
    const peerValues = peerEngagements;
    const { rank, cohortSize } = rankAmong(engagement, peerValues, false);
    comparisons.unshift({
      key: "engagement_rate",
      label: "Taxa de engajamento",
      value: engagement,
      average: cohortEngagementAvg,
      sampleSize: peerValues.length,
      deltaPct,
      band: bandFor(deltaPct, false),
      rank: peerValues.length > 0 ? rank : null,
      cohortSize,
      lowerIsBetter: false,
    });
  }

  const chartComparisons = comparisons.filter((row) => CHART_KEYS.has(row.key));
  const mix = MIX_KEYS.map((key) => {
    const value = post.metrics[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
    return { key, label: metricLabel(key), value };
  }).filter((row): row is { key: string; label: string; value: number } => row != null);

  const strengths = comparisons.filter((row) => row.band === "strong" || row.band === "above");
  const weaknesses = comparisons.filter((row) => row.band === "weak" || row.band === "below");

  const headline = buildHeadline(peers.length, productLabel, strengths, weaknesses);
  const bullets = buildBullets(post, peers.length, cohortLabel, comparisons, strengths, weaknesses);

  return {
    productLabel,
    cohortLabel,
    sampleSize: peers.length,
    engagementRate: engagement,
    cohortEngagementAvg,
    comparisons,
    chartComparisons,
    mix,
    strengths,
    weaknesses,
    headline,
    bullets,
  };
}

function names(rows: MetricComparison[], limit = 3): string {
  return rows.slice(0, limit).map((row) => row.label.toLowerCase()).join(", ");
}

function buildHeadline(
  peerCount: number,
  productLabel: string,
  strengths: MetricComparison[],
  weaknesses: MetricComparison[],
): string {
  if (peerCount === 0) {
    return `Única ${productLabel} neste recorte — ainda não há média de outras publicações para comparar.`;
  }
  if (strengths.length > 0 && weaknesses.length > 0) {
    return `Acima da média em ${names(strengths)}. Abaixo em ${names(weaknesses)}.`;
  }
  if (strengths.length > 0) {
    return `Performou acima da média das outras ${productLabel} em ${names(strengths)}.`;
  }
  if (weaknesses.length > 0) {
    return `Ficou abaixo da média em ${names(weaknesses)}.`;
  }
  return `Em linha com a média das outras publicações de ${productLabel} no período.`;
}

function buildBullets(
  post: IgMediaRow,
  peerCount: number,
  cohortLabel: string,
  comparisons: MetricComparison[],
  strengths: MetricComparison[],
  weaknesses: MetricComparison[],
): string[] {
  const bullets: string[] = [];
  const published = new Date(post.published_at).toLocaleString("pt-BR");
  bullets.push(`Publicada em ${published} · ${formatProductTypeLabel(post.media_product_type)}.`);
  if (peerCount > 0) {
    bullets.push(`Comparação com ${cohortLabel}.`);
  }
  const top = strengths[0];
  if (top?.deltaPct != null && top.rank != null) {
    bullets.push(
      `Destaque: ${top.label.toLowerCase()} ${top.deltaPct >= 0 ? "+" : ""}${top.deltaPct.toFixed(0)}% vs média (${top.rank}º de ${top.cohortSize}).`,
    );
  }
  const worst = weaknesses[0];
  if (worst?.deltaPct != null && worst.rank != null) {
    bullets.push(
      `Atenção: ${worst.label.toLowerCase()} ${worst.deltaPct.toFixed(0)}% vs média (${worst.rank}º de ${worst.cohortSize}).`,
    );
  }
  const engagement = comparisons.find((row) => row.key === "engagement_rate");
  if (engagement?.average != null && engagement.deltaPct != null) {
    bullets.push(
      `Taxa de engajamento ${engagement.value.toFixed(1)}% vs média ${engagement.average.toFixed(1)}% (${engagement.deltaPct >= 0 ? "+" : ""}${engagement.deltaPct.toFixed(0)}%).`,
    );
  }
  if (post.metrics_collected_at) {
    bullets.push(
      `Métricas coletadas em ${new Date(post.metrics_collected_at).toLocaleString("pt-BR")}.`,
    );
  }
  return bullets;
}
