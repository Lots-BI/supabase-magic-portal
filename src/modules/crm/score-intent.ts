import { matchIntentLexicon } from "./intent-lexicon";
import type { CrmSignalInput } from "./types";

const WEIGHTED_KINDS = new Set(["dm", "lead_form", "whatsapp", "form", "email", "call"]);

function daysBetween(iso: string, now: Date): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

type IntentFactor = { points: number; text: string };

function intentFactors(
  signals: readonly CrmSignalInput[],
  now: Date,
): { score: number; factors: IntentFactor[] } {
  if (signals.length === 0) return { score: 0, factors: [] };
  const sorted = [...signals].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const last = sorted[sorted.length - 1]!;
  const recency = daysBetween(last.occurredAt, now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const signals7d = sorted.filter((s) => s.occurredAt >= weekAgo).length;
  const bodies = sorted.map((s) => s.body).join("\n");
  const hit = matchIntentLexicon(bodies);
  const factors: IntentFactor[] = [];

  let score = 25;
  const weekPoints = Math.min(30, signals7d * 8);
  score += weekPoints;
  if (weekPoints > 0) {
    factors.push({
      points: weekPoints,
      text:
        signals7d === 1
          ? "Falou uma vez nos últimos 7 dias."
          : `Falou ${signals7d} vezes nos últimos 7 dias.`,
    });
  }
  if (hit.purchase) {
    score += 25;
    factors.push({ points: 25, text: "Falou em compra, preço ou orçamento." });
  }
  if (hit.question) {
    score += 10;
    factors.push({ points: 10, text: "Fez uma pergunta." });
  }
  if (hit.complaint) {
    score += 15;
    factors.push({ points: 15, text: "Demonstrou insatisfação." });
  }
  if (sorted.some((s) => WEIGHTED_KINDS.has(s.kind))) {
    score += 15;
    factors.push({ points: 15, text: "Chegou por Direct, formulário, WhatsApp ou ligação." });
  }
  if (recency <= 1) {
    score += 15;
    factors.push({ points: 15, text: "Falou nas últimas 24 horas." });
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), factors };
}

export function scoreIntent(signals: readonly CrmSignalInput[], now = new Date()): number {
  return intentFactors(signals, now).score;
}

/** Até três motivos, do mais forte ao mais fraco. Sem a fórmula. */
export function explainIntent(signals: readonly CrmSignalInput[], now = new Date()): string[] {
  const { factors } = intentFactors(signals, now);
  const lines = factors
    .filter((factor) => factor.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((factor) => factor.text);
  if (lines.length > 0) return lines;
  return ["Poucas pistas de interesse neste histórico."];
}
