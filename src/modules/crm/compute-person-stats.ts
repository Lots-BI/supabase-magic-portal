import { computeChurnState } from "./churn-state";
import { scoreIntent } from "./score-intent";
import type {
  CrmFieldFactInput,
  CrmPersonStats,
  CrmSignalInput,
  CrmSignalKind,
  CrmSignalPlace,
} from "./types";

function daysBetween(fromIso: string, to: Date): number {
  const t = new Date(fromIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((to.getTime() - t) / 86_400_000));
}

/** Segunda-feira UTC da semana ISO da data. */
export function isoWeekStartUtc(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function countStreak(weekKeysDesc: string[]): number {
  if (weekKeysDesc.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < weekKeysDesc.length; i++) {
    const newer = new Date(`${weekKeysDesc[i - 1]}T00:00:00Z`);
    const older = new Date(`${weekKeysDesc[i]}T00:00:00Z`);
    const diffDays = (newer.getTime() - older.getTime()) / 86_400_000;
    if (diffDays === 7) streak += 1;
    else break;
  }
  return streak;
}

function heatScore(intent: number, recencyDays: number, signalCount: number): number {
  const recencyFactor = 1 / (1 + recencyDays / 7);
  const freq = Math.log(1 + signalCount);
  return Math.round(intent * recencyFactor * freq * 100) / 100;
}

export function computePersonStats(
  signals: readonly CrmSignalInput[],
  facts: readonly CrmFieldFactInput[] = [],
  now = new Date(),
): CrmPersonStats {
  if (signals.length === 0) {
    return {
      signalCount: 0,
      kindCounts: {},
      placeCounts: {},
      mediaDistinct: 0,
      cardDistinct: 0,
      pillarAffinity: {},
      recencyDays: 0,
      tenureDays: 0,
      activeWeeks: 0,
      streakWeeks: 0,
      churnState: "novo",
      intentScore: 0,
      piiCompleteness: 0,
      heatScore: 0,
      firstSignalAt: null,
      lastSignalAt: null,
    };
  }

  const sorted = [...signals].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const recencyDays = daysBetween(last.occurredAt, now);
  const tenureDays = daysBetween(first.occurredAt, now);

  const kindCounts: Partial<Record<CrmSignalKind, number>> = {};
  const placeCounts: Partial<Record<CrmSignalPlace, number>> = {};
  const media = new Set<string>();
  const cards = new Set<string>();
  const pillarAffinity: Record<string, number> = {};

  for (const signal of sorted) {
    kindCounts[signal.kind] = (kindCounts[signal.kind] ?? 0) + 1;
    placeCounts[signal.place] = (placeCounts[signal.place] ?? 0) + 1;
    if (signal.igMediaId) media.add(signal.igMediaId);
    if (signal.contentCardId) cards.add(signal.contentCardId);
    const pillar = signal.payload?.pilarTitulo?.trim();
    if (pillar) pillarAffinity[pillar] = (pillarAffinity[pillar] ?? 0) + 1;
  }

  const weekKeys = [...new Set(sorted.map((s) => isoWeekStartUtc(s.occurredAt)))].sort().reverse();
  const previousGapDays =
    sorted.length >= 2
      ? daysBetween(sorted[sorted.length - 2]!.occurredAt, new Date(last.occurredAt))
      : null;

  const intentScore = scoreIntent(sorted, now);
  const piiKeys = new Set(facts.map((f) => f.field));
  const piiCompleteness = Math.round((piiKeys.size / 4) * 100) / 100;

  return {
    signalCount: sorted.length,
    kindCounts,
    placeCounts,
    mediaDistinct: media.size,
    cardDistinct: cards.size,
    pillarAffinity,
    recencyDays,
    tenureDays,
    activeWeeks: weekKeys.length,
    streakWeeks: countStreak(weekKeys),
    churnState: computeChurnState({
      signalCount: sorted.length,
      recencyDays,
      previousGapDays,
    }),
    intentScore,
    piiCompleteness,
    heatScore: heatScore(intentScore, recencyDays, sorted.length),
    firstSignalAt: first.occurredAt,
    lastSignalAt: last.occurredAt,
  };
}
