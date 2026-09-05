// Lots BI · Workflow de objetivos — um plano contínuo, objetivos sucessivos.

import type { PlanoItemStatus, PlanoObjetivo } from "./types";

export const OBJETIVO_WORKFLOW_FASE = [
  "planejamento",
  "em_andamento",
  "em_validacao",
  "concluido",
  "cancelado",
] as const;

export type ObjetivoWorkflowFase = (typeof OBJETIVO_WORKFLOW_FASE)[number];

export const OBJETIVO_FASE_LABEL: Record<ObjetivoWorkflowFase, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  em_validacao: "Em validação",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Resolve fase UX a partir de coluna workflow_fase ou status legado. */
export function resolveObjetivoFase(
  o: Pick<PlanoObjetivo, "status" | "workflow_fase" | "progresso_manual"> & {
    progressPct?: number | null;
  },
): ObjetivoWorkflowFase {
  const wf = (o as { workflow_fase?: string | null }).workflow_fase;
  if (wf && OBJETIVO_WORKFLOW_FASE.includes(wf as ObjetivoWorkflowFase)) {
    return wf as ObjetivoWorkflowFase;
  }
  const pct = o.progressPct ?? o.progresso_manual;
  if (o.status === "concluido") return "concluido";
  if (o.status === "cancelado") return "cancelado";
  if (o.status === "em_andamento" && pct != null && pct >= 90 && pct < 100) return "em_validacao";
  if (o.status === "em_andamento") return "em_andamento";
  return "planejamento";
}

export function faseToDbStatus(fase: ObjetivoWorkflowFase): PlanoItemStatus {
  switch (fase) {
    case "planejamento":
      return "pendente";
    case "em_andamento":
    case "em_validacao":
      return "em_andamento";
    case "concluido":
      return "concluido";
    case "cancelado":
      return "cancelado";
  }
}

export function isObjetivoAtivo(fase: ObjetivoWorkflowFase): boolean {
  return fase === "planejamento" || fase === "em_andamento" || fase === "em_validacao";
}

export function isObjetivoHistorico(fase: ObjetivoWorkflowFase): boolean {
  return fase === "concluido" || fase === "cancelado";
}

export type ObjetivoHistoricoTab = "ativos" | "concluidos" | "cancelados";

export function objetivoMatchesTab(fase: ObjetivoWorkflowFase, tab: ObjetivoHistoricoTab): boolean {
  if (tab === "ativos") return isObjetivoAtivo(fase);
  if (tab === "concluidos") return fase === "concluido";
  return fase === "cancelado";
}

/** Objetivo em foco: primeiro ativo por ordem; senão o mais recente em andamento. */
export function pickObjetivoAtual<
  T extends PlanoObjetivo & { progressPct?: number | null; workflow_fase?: string | null },
>(objetivos: T[]): T | null {
  const withFase = objetivos.map((o) => ({ o, fase: resolveObjetivoFase(o) }));
  const ativos = withFase.filter(({ fase }) => isObjetivoAtivo(fase)).map(({ o }) => o);
  if (ativos.length === 0) return null;
  const emExec = ativos.filter((o) => {
    const f = resolveObjetivoFase(o);
    return f === "em_andamento" || f === "em_validacao";
  });
  const pool = emExec.length > 0 ? emExec : ativos;
  return [...pool].sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at))[0];
}

export function shouldAutoConcluirObjetivo(progressPct: number | null): boolean {
  return progressPct != null && progressPct >= 100;
}

export function defaultPlanoTitulo(clienteNome: string): string {
  return `Plano Estratégico · ${clienteNome}`;
}

export function planoPeriodoLongo(from: string): { inicio: string; fim: string } {
  const start = from;
  const endDate = new Date(from + "T12:00:00");
  endDate.setFullYear(endDate.getFullYear() + 10);
  const fim = endDate.toISOString().slice(0, 10);
  return { inicio: start, fim };
}
