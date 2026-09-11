import { matchIntentLexicon } from "./intent-lexicon";
import type { CrmSignalInput } from "./types";

const WEIGHTED_KINDS = new Set(["dm", "lead_form", "whatsapp"]);

function daysBetween(iso: string, now: Date): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

export function scoreIntent(signals: readonly CrmSignalInput[], now = new Date()): number {
  if (signals.length === 0) return 0;
  const sorted = [...signals].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const last = sorted[sorted.length - 1]!;
  const recency = daysBetween(last.occurredAt, now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const signals7d = sorted.filter((s) => s.occurredAt >= weekAgo).length;
  const bodies = sorted.map((s) => s.body).join("\n");
  const hit = matchIntentLexicon(bodies);

  let score = 25;
  score += Math.min(30, signals7d * 8);
  if (hit.purchase) score += 25;
  if (hit.question) score += 10;
  if (hit.complaint) score += 15;
  if (sorted.some((s) => WEIGHTED_KINDS.has(s.kind))) score += 15;
  if (recency <= 1) score += 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}
