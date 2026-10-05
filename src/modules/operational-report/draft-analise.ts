// ============================================================================
// Lots BI · Rascunho de análise.
// Monta um HTML inicial a partir dos números que o relatório visual já
// calcula — a pessoa revisa no editor e só então clica Enviar. Nada aqui
// grava, envia ou chama IA; é só texto para começar mais rápido.
// ============================================================================

import { formatDeltaPct, formatReportValue } from "./format";
import type { ReportCallout, ReportMetric, ReportPlatformSection } from "./types";

const MOVE_THRESHOLD = 8;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function metricLine(metric: ReportMetric): string {
  const atual = formatReportValue(metric.format, metric.value);
  const anterior = formatReportValue(metric.format, metric.previous);
  const delta = formatDeltaPct(metric.deltaPct);
  return `<li>${escapeHtml(metric.label)}: ${atual} (era ${anterior}, ${delta})</li>`;
}

function biggestMove(metrics: ReportMetric[]): ReportMetric | null {
  const moved = metrics.filter(
    (metric) => metric.deltaPct != null && Math.abs(metric.deltaPct) >= MOVE_THRESHOLD,
  );
  if (moved.length === 0) return null;
  return [...moved].sort((a, b) => Math.abs(b.deltaPct!) - Math.abs(a.deltaPct!))[0] ?? null;
}

function moveSentence(metric: ReportMetric): string {
  const delta = metric.deltaPct ?? 0;
  const subiu = delta > 0;
  const bom = subiu === metric.positiveIsGood;
  const direcao = subiu ? "subiu" : "caiu";
  const leitura = bom ? "um bom sinal" : "pede atenção";
  return `<p>${escapeHtml(metric.label)} ${direcao} ${formatDeltaPct(metric.deltaPct)} no período — ${leitura}.</p>`;
}

/**
 * Rascunho da análise de uma plataforma: abertura, métricas do tile,
 * o maior movimento (se houver) e a campanha de maior investimento em
 * mídia paga. Termina com um lembrete para completar o contexto.
 */
export function draftPlatformAnalise(platform: ReportPlatformSection, periodLabel: string): string {
  const parts: string[] = [];
  parts.push(`<p>${escapeHtml(platform.label)} em ${escapeHtml(periodLabel.toLowerCase())}:</p>`);

  if (platform.metrics.length > 0) {
    parts.push(`<ul>${platform.metrics.map(metricLine).join("")}</ul>`);
  }

  const move = biggestMove(platform.metrics);
  if (move) parts.push(moveSentence(move));

  if (platform.family === "paid" && platform.campaigns.length > 0) {
    const top = platform.campaigns[0];
    const resultados =
      top.results != null ? `, com ${formatReportValue("int", top.results)} resultados` : "";
    parts.push(
      `<p>Campanha de maior investimento: <strong>${escapeHtml(top.name)}</strong>, ${formatReportValue(
        "currency",
        top.spend,
      )} investidos${resultados}.</p>`,
    );
  }

  parts.push("<p>[Complete com o contexto da conta: o que explica esse resultado?]</p>");

  return parts.join("");
}

/**
 * Rascunho da nota de queda: lista os movimentos negativos do cartaz.
 * Sem movimento negativo visível, devolve um esqueleto curto para a
 * pessoa descrever a causa à mão.
 */
export function draftQuedaAnalise(movers: ReportCallout[], periodLabel: string): string {
  const negativos = [...movers]
    .filter((mover) => mover.tone === "negative")
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  if (negativos.length === 0) {
    return [
      `<p>Nenhuma queda relevante identificada automaticamente em ${escapeHtml(periodLabel.toLowerCase())}.</p>`,
      "<p>[Descreva aqui o que causou a queda e o plano de ação.]</p>",
    ].join("");
  }

  const itens = negativos
    .map(
      (mover) =>
        `<li>${escapeHtml(mover.title)} (${escapeHtml(mover.detail)}): ${formatDeltaPct(mover.deltaPct)}</li>`,
    )
    .join("");

  return [
    `<p>Movimentos de queda em ${escapeHtml(periodLabel.toLowerCase())}:</p>`,
    `<ul>${itens}</ul>`,
    "<p>[Complete com a causa da queda e o plano de ação.]</p>",
  ].join("");
}
