import { type Period } from "@/lib/period";
import { PLATFORM_FAMILY, type Totals } from "@/lib/metrics";
import { getPlatformDef } from "@/lib/platforms/registry";
import {
  aggregatePeriod,
  pctDelta,
  type Row,
} from "@/lib/platforms/engine";
import type { Platform } from "@/lib/metrics";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { FORMAT_LABEL, type ContentFormato } from "@/modules/approval/types/content-card";
import { formatProductTypeLabel } from "@/components/lots/instagram-posts/format-metrics";
import { formatReportValue } from "./format";
import type {
  OperationalReport,
  ReportCallout,
  ReportContentSection,
  ReportMetric,
  ReportMixSlice,
  ReportMood,
  ReportPlatformSection,
  ReportPostHighlight,
  ReportPostsSection,
  ReportPulse,
} from "./types";

const PLATFORM_ORDER = ["meta_ads", "google_ads", "instagram", "ga4", "google_business"] as const;

const PLATFORM_HREF: Record<string, string> = {
  meta_ads: "meta-ads",
  google_ads: "google-ads",
  instagram: "instagram",
  ga4: "ga4",
  google_business: "google-business",
};

const MOVE_THRESHOLD = 8;
const HERO_CAP = 4;
const SPOTLIGHT_CAP = 3;
const MOVER_CAP = 3;
const CAMPAIGN_CAP = 3;
const POST_HIGHLIGHT_CAP = 5;

export type ReportCardRow = {
  id: string;
  status: string;
  formato: string | null;
  data_publicacao: string;
  publish_status: string | null;
};

export type ReportMediaRow = {
  id: string;
  published_at: string;
  media_product_type: string;
  permalink: string | null;
  caption: string | null;
  metrics: Record<string, number | undefined>;
  contentTitle?: string | null;
};

export type BuildOperationalReportInput = {
  clienteNome: string;
  cadastroClienteId: number;
  clienteSlug: string;
  period: Period;
  platformRows: Record<string, Row[]>;
  postsCurrent: ReportMediaRow[];
  postsPrevious: ReportMediaRow[];
  cardsCurrent: ReportCardRow[];
  cardsPrevious: ReportCardRow[];
  overviewCurrent?: Totals;
  overviewPrevious?: Totals;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hasActivity(value: number, previous: number): boolean {
  return value > 0 || previous > 0;
}

function metricRow(
  key: string,
  label: string,
  value: number,
  previous: number,
  format: ReportMetric["format"],
  positiveIsGood: boolean,
  kind: ReportMetric["kind"],
  description?: string,
): ReportMetric {
  return {
    key,
    label,
    value,
    previous,
    deltaPct: pctDelta(value, previous),
    format,
    positiveIsGood,
    description,
    kind,
  };
}

function toneFor(delta: number | null, positiveIsGood: boolean): ReportCallout["tone"] {
  if (delta == null || Math.abs(delta) < MOVE_THRESHOLD) return "neutral";
  const up = delta > 0;
  return up === positiveIsGood ? "positive" : "negative";
}

export function buildOperationalReport(input: BuildOperationalReportInput): OperationalReport {
  const platforms: ReportPlatformSection[] = [];

  for (const key of PLATFORM_ORDER) {
    const def = getPlatformDef(key);
    if (!def) continue;
    const rows = input.platformRows[key] ?? [];
    const hasData = rows.some((row) => row.data >= input.period.from && row.data <= input.period.to);
    if (!hasData) continue;

    const agg = aggregatePeriod(def, rows, input.period);
    const metrics = spotlightMetrics(def, agg);
    const campaigns = [...agg.campaigns]
      .sort((a, b) => (b.totals.spend ?? b.totals.results ?? 0) - (a.totals.spend ?? a.totals.results ?? 0))
      .slice(0, CAMPAIGN_CAP)
      .map((campaign) => ({
        name: campaign.campanha,
        spend: campaign.totals.spend ?? 0,
        results: campaign.totals.results ?? campaign.totals.conversions ?? null,
        clicks: campaign.totals.clicks ?? null,
      }));

    const family = PLATFORM_FAMILY[key as Platform] ?? "analytics";
    const dailyMetricKey =
      metrics[0]?.key ?? def.heroMetrics[0] ?? def.metrics[0]?.key ?? null;

    platforms.push({
      key,
      label: def.label,
      family,
      description: def.description,
      href: `/cliente/${input.clienteSlug}/${PLATFORM_HREF[key]}`,
      hasData: true,
      lastDay: agg.lastSync,
      metrics,
      campaigns,
      daily: slimDaily(agg.daily, [
        dailyMetricKey,
        family === "paid" ? "spend" : null,
      ]),
      dailyMetricKey,
    });
  }

  const posts = buildPostsSection(input.postsCurrent, input.postsPrevious);
  const content = buildContentSection(input.cardsCurrent, input.cardsPrevious);
  const heroes = pickHeroes(platforms, input.overviewCurrent, input.overviewPrevious);
  const movers = pickMovers(platforms, posts, content);
  const pulse = buildPulse(platforms);
  const mix = buildMix(platforms);
  const mood = pickMood(movers, heroes);
  const withData = platforms.map((p) => p.label);
  if (posts) withData.push("Publicações");
  if (content) withData.push("Conteúdos");

  return {
    clienteNome: input.clienteNome,
    cadastroClienteId: input.cadastroClienteId,
    clienteSlug: input.clienteSlug,
    period: {
      from: input.period.from,
      to: input.period.to,
      prevFrom: input.period.prevFrom,
      prevTo: input.period.prevTo,
      label: input.period.label,
      days: input.period.days,
    },
    reading: {
      headline: buildHeadline(input.period, heroes, posts, content),
      mood: mood.mood,
      moodLabel: mood.label,
    },
    heroes,
    movers,
    pulse,
    mix,
    platforms,
    posts,
    content,
    coverage: {
      withData,
      withoutData: [],
      notes: [],
    },
  };
}

function spotlightMetrics(
  def: NonNullable<ReturnType<typeof getPlatformDef>>,
  agg: ReturnType<typeof aggregatePeriod>,
): ReportMetric[] {
  const seen = new Set<string>();
  const out: ReportMetric[] = [];

  const push = (row: ReportMetric) => {
    if (seen.has(row.key) || !hasActivity(row.value, row.previous)) return;
    seen.add(row.key);
    out.push(row);
  };

  for (const key of def.heroMetrics) {
    const metric = def.metrics.find((item) => item.key === key);
    if (metric) {
      push(
        metricRow(
          metric.key,
          metric.label,
          agg.current[metric.key] ?? 0,
          agg.previous[metric.key] ?? 0,
          metric.format,
          metric.positiveIsGood ?? true,
          "metric",
        ),
      );
    }
    const kpi = def.kpis.find((item) => item.key === key);
    if (kpi) {
      push(
        metricRow(
          kpi.key,
          kpi.label,
          agg.currentKpis[kpi.key] ?? 0,
          agg.previousKpis[kpi.key] ?? 0,
          kpi.format,
          kpi.positiveIsGood,
          "kpi",
        ),
      );
    }
    if (out.length >= SPOTLIGHT_CAP) return out;
  }

  if (out.length === 0) {
    for (const metric of def.metrics) {
      push(
        metricRow(
          metric.key,
          metric.label,
          agg.current[metric.key] ?? 0,
          agg.previous[metric.key] ?? 0,
          metric.format,
          metric.positiveIsGood ?? true,
          "metric",
        ),
      );
      if (out.length >= SPOTLIGHT_CAP) break;
    }
  }

  return out.slice(0, SPOTLIGHT_CAP);
}

function slimDaily(
  daily: Array<Record<string, number | string>>,
  keys: Array<string | null>,
): Array<Record<string, number | string>> {
  const keep = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  return daily.map((point) => {
    const next: Record<string, number | string> = { date: String(point.date) };
    for (const key of keep) next[key] = num(point[key]);
    return next;
  });
}

function pickHeroes(
  platforms: ReportPlatformSection[],
  overviewCurrent?: Totals,
  overviewPrevious?: Totals,
): ReportMetric[] {
  const byKey = (platformKey: string, metricKey: string) =>
    platforms.find((p) => p.key === platformKey)?.metrics.find((m) => m.key === metricKey);

  const metaSpend = byKey("meta_ads", "spend");
  const googleSpend = byKey("google_ads", "spend");
  const spendValue = (metaSpend?.value ?? 0) + (googleSpend?.value ?? 0) || (overviewCurrent?.spend ?? 0);
  const spendPrev = (metaSpend?.previous ?? 0) + (googleSpend?.previous ?? 0) || (overviewPrevious?.spend ?? 0);

  const metaResults = byKey("meta_ads", "results");
  const googleConv = byKey("google_ads", "conversions");
  const resultsValue =
    (metaResults?.value ?? 0) + (googleConv?.value ?? 0) || (overviewCurrent?.conversions ?? 0);
  const resultsPrev =
    (metaResults?.previous ?? 0) + (googleConv?.previous ?? 0) || (overviewPrevious?.conversions ?? 0);

  const igViews = byKey("instagram", "views");
  const igReach = byKey("instagram", "reach");
  const gaSessions = byKey("ga4", "sessions");

  const reachValue = igReach?.value || (overviewCurrent?.reach ?? 0);
  const reachPrev = igReach?.previous || (overviewPrevious?.reach ?? 0);
  const sessionsValue = gaSessions?.value || (overviewCurrent?.sessions ?? 0);
  const sessionsPrev = gaSessions?.previous || (overviewPrevious?.sessions ?? 0);

  const heroes: ReportMetric[] = [];
  if (hasActivity(spendValue, spendPrev)) {
    heroes.push(metricRow("hero_spend", "Investimento", spendValue, spendPrev, "currency", true, "metric"));
  }
  if (hasActivity(resultsValue, resultsPrev)) {
    heroes.push(metricRow("hero_results", "Resultados", resultsValue, resultsPrev, "int", true, "metric"));
  }
  if (igViews && hasActivity(igViews.value, igViews.previous)) {
    heroes.push({ ...igViews, key: "hero_ig_views", label: "Visualizações" });
  } else if (hasActivity(reachValue, reachPrev)) {
    heroes.push(metricRow("hero_ig_reach", "Alcance", reachValue, reachPrev, "int", true, "metric"));
  }
  if (hasActivity(sessionsValue, sessionsPrev)) {
    heroes.push(metricRow("hero_sessions", "Sessões", sessionsValue, sessionsPrev, "int", true, "metric"));
  }
  return heroes.slice(0, HERO_CAP);
}

function pickMovers(
  platforms: ReportPlatformSection[],
  posts: ReportPostsSection | null,
  content: ReportContentSection | null,
): ReportCallout[] {
  const movers: ReportCallout[] = [];

  for (const platform of platforms) {
    for (const metric of platform.metrics) {
      if (metric.deltaPct == null || Math.abs(metric.deltaPct) < MOVE_THRESHOLD) continue;
      if (!hasActivity(metric.value, metric.previous)) continue;
      movers.push({
        id: `${platform.key}-${metric.key}`,
        tone: toneFor(metric.deltaPct, metric.positiveIsGood),
        title: metric.label,
        detail: platform.label,
        deltaPct: metric.deltaPct,
      });
    }
  }

  if (posts) {
    const delta = pctDelta(posts.views, posts.previousViews);
    if (delta != null && Math.abs(delta) >= MOVE_THRESHOLD) {
      movers.push({
        id: "posts-views",
        tone: toneFor(delta, true),
        title: "Views das peças",
        detail: "Publicações",
        deltaPct: delta,
      });
    }
  }

  if (content) {
    const delta = pctDelta(content.published, content.previousPublished);
    if (delta != null && Math.abs(delta) >= MOVE_THRESHOLD) {
      movers.push({
        id: "content-published",
        tone: toneFor(delta, true),
        title: "Peças publicadas",
        detail: "Conteúdos",
        deltaPct: delta,
      });
    }
  }

  movers.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return movers.slice(0, MOVER_CAP);
}

function pickMood(
  movers: ReportCallout[],
  heroes: ReportMetric[],
): { mood: ReportMood; label: string } {
  const pos = movers.filter((m) => m.tone === "positive").length;
  const neg = movers.filter((m) => m.tone === "negative").length;
  if (neg > pos) return { mood: "down", label: "Atenção" };
  if (pos > neg) return { mood: "up", label: "No ritmo" };

  const spend = heroes.find((h) => h.key === "hero_spend");
  if (spend?.deltaPct != null && spend.deltaPct < -MOVE_THRESHOLD) {
    return { mood: "down", label: "Atenção" };
  }
  if (heroes.some((h) => h.deltaPct != null && h.deltaPct > MOVE_THRESHOLD)) {
    return { mood: "up", label: "No ritmo" };
  }
  return { mood: "steady", label: "Estável" };
}

function buildHeadline(
  period: Period,
  heroes: ReportMetric[],
  posts: ReportPostsSection | null,
  content: ReportContentSection | null,
): string {
  const spend = heroes.find((h) => h.key === "hero_spend");
  const results = heroes.find((h) => h.key === "hero_results");
  const views = heroes.find((h) => h.key === "hero_ig_views");
  const sessions = heroes.find((h) => h.key === "hero_sessions");

  if (spend && results) {
    return `Investiu ${formatReportValue("currency", spend.value)} e gerou ${formatReportValue("int", results.value)} resultados.`;
  }
  if (spend) {
    return `Investiu ${formatReportValue("currency", spend.value)} em mídia paga.`;
  }
  if (views) {
    return `${formatReportValue("int", views.value)} visualizações no Instagram.`;
  }
  if (sessions) {
    return `${formatReportValue("int", sessions.value)} sessões no site.`;
  }
  if (posts && posts.count > 0) {
    return posts.count === 1 ? "1 publicação no recorte." : `${posts.count} publicações no recorte.`;
  }
  if (content && content.planned > 0) {
    return content.planned === 1
      ? "1 conteúdo no calendário."
      : `${content.planned} conteúdos no calendário.`;
  }
  return `Ainda não há métricas coletadas em ${period.label.toLowerCase()}.`;
}

function buildPulse(platforms: ReportPlatformSection[]): ReportPulse | null {
  const paid = platforms.filter((platform) => platform.family === "paid");
  const paidSpend = paid.filter((platform) => platform.metrics.some((m) => m.key === "spend"));
  if (paidSpend.length > 0) {
    const dates = new Set<string>();
    for (const platform of paidSpend) {
      for (const point of platform.daily) dates.add(String(point.date));
    }
    const daily = [...dates].sort().map((date) => {
      let value = 0;
      for (const platform of paidSpend) {
        const point = platform.daily.find((row) => String(row.date) === date);
        value += num(point?.spend);
      }
      return { date, value };
    });
    if (daily.some((point) => point.value > 0) && daily.length > 1) {
      return { key: "spend", label: "Investimento no dia", format: "currency", daily };
    }
  }

  const first = platforms.find((platform) => platform.dailyMetricKey && platform.daily.length > 1);
  if (!first?.dailyMetricKey) return null;
  const daily = first.daily.map((point) => ({
    date: String(point.date),
    value: num(point[first.dailyMetricKey!]),
  }));
  if (!daily.some((point) => point.value > 0)) return null;
  const metric = first.metrics.find((item) => item.key === first.dailyMetricKey);
  return {
    key: first.dailyMetricKey,
    label: metric?.label ?? first.label,
    format: metric?.format ?? "int",
    daily,
  };
}

function buildMix(platforms: ReportPlatformSection[]): ReportMixSlice[] {
  return platforms
    .filter((platform) => platform.family === "paid")
    .map((platform) => {
      const spend = platform.metrics.find((metric) => metric.key === "spend");
      return spend && spend.value > 0
        ? { key: platform.key, label: platform.label, value: spend.value, format: "currency" as const }
        : null;
    })
    .filter((slice): slice is ReportMixSlice => slice != null);
}

function buildPostsSection(
  current: ReportMediaRow[],
  previous: ReportMediaRow[],
): ReportPostsSection | null {
  if (current.length === 0) return null;

  const sum = (rows: ReportMediaRow[], key: string) =>
    rows.reduce((acc, row) => acc + num(row.metrics[key]), 0);

  const highlights: ReportPostHighlight[] = [...current]
    .sort(
      (a, b) =>
        num(b.metrics.views) - num(a.metrics.views) ||
        num(b.metrics.total_interactions) - num(a.metrics.total_interactions),
    )
    .slice(0, POST_HIGHLIGHT_CAP)
    .map((row) => ({
      id: row.id,
      publishedAt: row.published_at,
      productType: formatProductTypeLabel(row.media_product_type),
      title: row.contentTitle?.trim() || excerptCaption(row.caption),
      views: typeof row.metrics.views === "number" ? row.metrics.views : null,
      interactions:
        typeof row.metrics.total_interactions === "number" ? row.metrics.total_interactions : null,
      permalink: row.permalink,
    }));

  return {
    count: current.length,
    previousCount: previous.length,
    views: sum(current, "views"),
    previousViews: sum(previous, "views"),
    interactions: sum(current, "total_interactions"),
    previousInteractions: sum(previous, "total_interactions"),
    highlights,
  };
}

function excerptCaption(caption: string | null): string | null {
  if (!caption?.trim()) return null;
  const plain = caption.replace(/\s+/g, " ").trim();
  return plain.length <= 80 ? plain : `${plain.slice(0, 79).trimEnd()}…`;
}

function buildContentSection(
  current: ReportCardRow[],
  previous: ReportCardRow[],
): ReportContentSection | null {
  if (current.length === 0) return null;

  const publishedOf = (rows: ReportCardRow[]) =>
    rows.filter((row) => row.status === "publicado" || row.publish_status === "published").length;

  const byStatusMap = new Map<string, number>();
  for (const row of current) {
    byStatusMap.set(row.status, (byStatusMap.get(row.status) ?? 0) + 1);
  }
  const byStatus = [...byStatusMap.entries()]
    .map(([status, count]) => ({
      status,
      label: KANBAN_COLUMNS.find((col) => col.status === status)?.label ?? status,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const byFormatoMap = new Map<string, number>();
  for (const row of current) {
    const key = row.formato || "sem formato";
    byFormatoMap.set(key, (byFormatoMap.get(key) ?? 0) + 1);
  }
  const byFormato = [...byFormatoMap.entries()].map(([formato, count]) => ({
    formato: FORMAT_LABEL[formato as ContentFormato] ?? formato,
    count,
  }));

  return {
    planned: current.length,
    previousPlanned: previous.length,
    published: publishedOf(current),
    previousPublished: publishedOf(previous),
    byStatus,
    byFormato,
  };
}
