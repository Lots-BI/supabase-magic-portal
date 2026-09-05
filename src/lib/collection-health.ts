import { addDaysISO, diffDaysISO } from "@/lib/period";
import { PLATFORM_LABEL, type Platform } from "@/lib/metrics";

const PLATFORM_ORDER: Platform[] = [
  "meta_ads",
  "google_ads",
  "instagram",
  "ga4",
  "google_business",
  "tiktok",
];

const PLATFORM_ALIASES: Record<string, Platform> = {
  meta_ads: "meta_ads",
  "meta-ads": "meta_ads",
  google_ads: "google_ads",
  "google-ads": "google_ads",
  ga4: "ga4",
  instagram: "instagram",
  google_business: "google_business",
  "google-business": "google_business",
  tiktok: "tiktok",
};

export const COLLECTION_LOOKBACK_DAYS = 14;

export type PlatformHealthStatus = "ok" | "gaps" | "delayed" | "stale" | "empty";
export type CollectionOverall = "ok" | "warning" | "alert";

export type PlatformHealth = {
  key: Platform;
  label: string;
  lastDate: string | null;
  lagDays: number;
  missingDates: string[];
  status: PlatformHealthStatus;
};

export type CollectionHealth = {
  today: string;
  expectedEnd: string;
  windowStart: string;
  platforms: PlatformHealth[];
  overall: CollectionOverall;
  title: string;
  detail: string;
};

export function normalizeCollectionPlatform(raw: string): Platform | null {
  return PLATFORM_ALIASES[raw] ?? PLATFORM_ALIASES[raw.replace(/-/g, "_")] ?? null;
}

export function eachIsoDay(from: string, to: string): string[] {
  if (from > to) return [];
  const days: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDaysISO(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

export function assessCollectionHealth(input: {
  today: string;
  rows: Array<{ plataforma: string; data: string }>;
  knownPlatforms?: string[];
  lookbackDays?: number;
}): CollectionHealth {
  const lookback = input.lookbackDays ?? COLLECTION_LOOKBACK_DAYS;
  const expectedEnd = addDaysISO(input.today, -1);
  const windowStart = addDaysISO(input.today, -lookback);

  const datesByPlatform = new Map<Platform, Set<string>>();
  const register = (key: Platform, date?: string) => {
    const set = datesByPlatform.get(key) ?? new Set<string>();
    if (date && date >= windowStart && date <= input.today) set.add(date);
    datesByPlatform.set(key, set);
  };

  for (const raw of input.knownPlatforms ?? []) {
    const key = normalizeCollectionPlatform(raw);
    if (key) register(key);
  }
  for (const row of input.rows) {
    const key = normalizeCollectionPlatform(row.plataforma);
    if (key) register(key, row.data);
  }

  const platforms = PLATFORM_ORDER.filter((key) => datesByPlatform.has(key)).map((key) =>
    assessPlatform(key, datesByPlatform.get(key) ?? new Set(), windowStart, expectedEnd),
  );

  return {
    today: input.today,
    expectedEnd,
    windowStart,
    platforms,
    ...summarize(platforms),
  };
}

function assessPlatform(
  key: Platform,
  dates: Set<string>,
  windowStart: string,
  expectedEnd: string,
): PlatformHealth {
  const present = [...dates].filter((d) => d <= expectedEnd).sort();
  const lastDate = present.at(-1) ?? null;
  const lagDays = lastDate
    ? Math.max(0, diffDaysISO(lastDate, expectedEnd))
    : lookbackSpan(windowStart, expectedEnd);
  const coverageStart = present[0] ?? windowStart;
  const missingDates = eachIsoDay(coverageStart, expectedEnd).filter((day) => !dates.has(day));
  const gapDates = lastDate ? missingDates.filter((day) => day < lastDate) : missingDates;

  let status: PlatformHealthStatus = "ok";
  if (present.length === 0) status = "empty";
  else if (lagDays >= 4) status = "stale";
  else if (gapDates.length > 0) status = "gaps";
  else if (lagDays >= 2) status = "delayed";

  return {
    key,
    label: PLATFORM_LABEL[key],
    lastDate,
    lagDays,
    missingDates: gapDates.length > 0 ? gapDates : missingDates,
    status,
  };

  return {
    key,
    label: PLATFORM_LABEL[key],
    lastDate,
    lagDays,
    missingDates,
    status,
  };
}

function lookbackSpan(windowStart: string, expectedEnd: string) {
  return diffDaysISO(windowStart, expectedEnd) + 1;
}

function summarize(
  platforms: PlatformHealth[],
): Pick<CollectionHealth, "overall" | "title" | "detail"> {
  if (platforms.length === 0) {
    return {
      overall: "alert",
      title: "Sem dados de coleta",
      detail: "Nenhuma plataforma enviou métricas ainda para esta conta.",
    };
  }

  const broken = platforms.filter((p) => p.status === "empty" || p.status === "stale");
  const issues = platforms.filter((p) => p.status !== "ok");
  const gapCount = platforms.reduce((sum, p) => sum + p.missingDates.length, 0);
  const worstLag = Math.max(0, ...platforms.map((p) => p.lagDays));

  if (issues.length === 0) {
    return {
      overall: "ok",
      title: "Coleta em dia",
      detail: "Todas as plataformas ativas têm registro até ontem.",
    };
  }

  if (broken.length > 0) {
    const names = broken.map((p) => p.label).join(", ");
    return {
      overall: "alert",
      title: "Coleta com falha",
      detail:
        broken.length === 1
          ? `${names} está sem dados recentes. A série pode estar incompleta.`
          : `${names} estão sem dados recentes. A série pode estar incompleta.`,
    };
  }

  const gappy = platforms.filter((p) => p.status === "gaps");
  if (gappy.length > 0) {
    const first = gappy[0];
    const extra =
      gappy.length > 1 ? ` · +${gappy.length - 1} plataforma${gappy.length === 2 ? "" : "s"}` : "";
    return {
      overall: "warning",
      title: "Coleta incompleta",
      detail: `${first.label} sem ${first.missingDates.length} dia${first.missingDates.length === 1 ? "" : "s"} no período${extra}. ${gapCount} dia${gapCount === 1 ? "" : "s"} faltando no total.`,
    };
  }

  const delayed = platforms.find((p) => p.status === "delayed");
  return {
    overall: "warning",
    title: "Coleta atrasada",
    detail: delayed
      ? `${delayed.label} parou em ${delayed.lastDate ?? "—"}. Esperado até ontem (${worstLag} dia${worstLag === 1 ? "" : "s"} de atraso).`
      : "Há atraso em pelo menos uma plataforma ativa.",
  };
}
