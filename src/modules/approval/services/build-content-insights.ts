import type { IgMediaMetrics, IgMediaRow } from "@/modules/instagram-posts/types";

const BRT = "America/Sao_Paulo";
const DAY_LABELS_MON_FIRST = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
const HOUR_BAND_STARTS = [0, 3, 6, 9, 12, 15, 18, 21] as const;

export type InsightTopPost = {
  post: IgMediaRow;
  score: number;
};

export type InsightDayBar = {
  weekday: number;
  label: string;
  avg: number;
  count: number;
};

export type InsightHourBand = {
  start: number;
  end: number;
  label: string;
  avg: number;
  count: number;
};

export type ContentInsights = {
  top7: InsightTopPost[];
  days: InsightDayBar[];
  hours: InsightHourBand[];
  peakHour: string | null;
  sampleSize: number;
};

export function interactionScore(metrics: IgMediaMetrics | null | undefined): number {
  if (!metrics) return 0;
  return metrics.total_interactions ?? metrics.reach ?? metrics.likes ?? 0;
}

export function brazilWeekdayAndHour(iso: string): { weekday: number; hour: number } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRT,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekdayRaw = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hourRaw = parts.find((part) => part.type === "hour")?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[weekdayRaw];
  const hour = Number(hourRaw);
  if (weekday == null || !Number.isFinite(hour)) return null;
  return { weekday, hour };
}

function monFirstIndex(sundayFirst: number): number {
  return (sundayFirst + 6) % 7;
}

function bandForHour(hour: number): (typeof HOUR_BAND_STARTS)[number] {
  const start = Math.floor(hour / 3) * 3;
  return (HOUR_BAND_STARTS as readonly number[]).includes(start)
    ? (start as (typeof HOUR_BAND_STARTS)[number])
    : 0;
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function buildContentInsights(posts: IgMediaRow[], limit = 7): ContentInsights {
  const ranked = [...posts]
    .map((post) => ({ post, score: interactionScore(post.metrics) }))
    .sort((a, b) => b.score - a.score || b.post.published_at.localeCompare(a.post.published_at));

  const dayBuckets = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  const hourBuckets = HOUR_BAND_STARTS.map(() => ({ sum: 0, count: 0 }));
  const exactHour = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }));

  for (const row of ranked) {
    const parts = brazilWeekdayAndHour(row.post.published_at);
    if (!parts) continue;
    const dayIdx = monFirstIndex(parts.weekday);
    dayBuckets[dayIdx]!.sum += row.score;
    dayBuckets[dayIdx]!.count += 1;
    const bandStart = bandForHour(parts.hour);
    const bandIdx = HOUR_BAND_STARTS.indexOf(bandStart);
    if (bandIdx >= 0) {
      hourBuckets[bandIdx]!.sum += row.score;
      hourBuckets[bandIdx]!.count += 1;
    }
    exactHour[parts.hour]!.sum += row.score;
    exactHour[parts.hour]!.count += 1;
  }

  let peakHour: string | null = null;
  let peakAvg = -1;
  for (let hour = 0; hour < 24; hour++) {
    const bucket = exactHour[hour]!;
    if (bucket.count === 0) continue;
    const avg = bucket.sum / bucket.count;
    if (avg > peakAvg) {
      peakAvg = avg;
      peakHour = formatHourLabel(hour);
    }
  }

  return {
    top7: ranked.slice(0, limit),
    days: DAY_LABELS_MON_FIRST.map((label, idx) => {
      const bucket = dayBuckets[idx]!;
      return {
        weekday: idx,
        label,
        avg: bucket.count > 0 ? bucket.sum / bucket.count : 0,
        count: bucket.count,
      };
    }),
    hours: HOUR_BAND_STARTS.map((start, idx) => {
      const bucket = hourBuckets[idx]!;
      const end = start + 2;
      return {
        start,
        end,
        label: `${formatHourLabel(start)}–${formatHourLabel(end)}`,
        avg: bucket.count > 0 ? bucket.sum / bucket.count : 0,
        count: bucket.count,
      };
    }),
    peakHour,
    sampleSize: ranked.length,
  };
}

export function postThumbUrl(post: IgMediaRow): string | null {
  return post.thumbnail_url || post.media_url || null;
}
