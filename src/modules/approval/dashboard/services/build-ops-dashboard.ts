import type { ContentCardEvent } from "../../types/content-card-event";
import type { ContentCardStatus } from "../../types/content-card";
import { computeStageDurations, type StageDuration } from "../../services/compute-stage-durations";
import type { StageAverageMs, WorkflowMetricsFramework } from "../types/dashboard";

const STAGE_LABELS: Record<string, string> = {
  "start->producao": "Início → Produção",
  "start->roteiro": "Início → Roteiro",
  "roteiro->aguardando_aprovacao": "Roteiro → Aguardando aprovação",
  "roteiro->aguardando_material": "Roteiro → Material (legado/atalho)",
  "start->aguardando_aprovacao": "Início → Aguardando aprovação (legado)",
  "aguardando_aprovacao->aguardando_material": "Aprovação roteiro → Material",
  "aguardando_material->producao": "Material → Produção",
  "producao->aguardando_aprovacao_final": "Produção → Aprovação final",
  "aguardando_aprovacao_final->agendado": "Aprovação final → Agendado",
  "agendado->publicado": "Agendado → Publicado",
  "publicado->arquivado": "Publicado → Arquivado",
  // legado
  "producao->edicao": "Produção → Edição (legado)",
  "edicao->aguardando_aprovacao": "Edição → Aguardando aprovação (legado)",
  "aguardando_aprovacao->aprovado": "Aprovação → Aprovado (legado)",
  "aprovado->publicado": "Aprovado → Publicado (legado)",
};

function stageKey(d: StageDuration): string {
  return `${d.fromStatus}->${d.toStatus}`;
}

export function aggregateStageAverages(
  eventsByCard: Map<string, ContentCardEvent[]>,
): StageAverageMs[] {
  const buckets = new Map<string, number[]>();

  for (const events of eventsByCard.values()) {
    for (const d of computeStageDurations(events)) {
      const key = stageKey(d);
      const list = buckets.get(key) ?? [];
      list.push(d.durationMs);
      buckets.set(key, list);
    }
  }

  const order: string[] = [
    "start->roteiro",
    "roteiro->aguardando_aprovacao",
    "roteiro->aguardando_material",
    "start->aguardando_aprovacao",
    "start->producao",
    "aguardando_aprovacao->aguardando_material",
    "aguardando_material->producao",
    "producao->aguardando_aprovacao_final",
    "aguardando_aprovacao_final->agendado",
    "agendado->publicado",
    "publicado->arquivado",
  ];

  return order.map((key) => {
    const samples = buckets.get(key) ?? [];
    const averageMs =
      samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
    return {
      stageKey: key,
      label: STAGE_LABELS[key] ?? key,
      averageMs,
      sampleSize: samples.length,
    };
  });
}

export function formatDurationMs(ms: number | null): string {
  if (ms == null) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export const WORKFLOW_METRICS_FRAMEWORK: WorkflowMetricsFramework = {
  sla: {
    enabled: false,
    description: "SLA por etapa — estrutura reservada para Fase 5+",
  },
  leadTime: {
    enabled: false,
    description: "Lead time (criação → publicação) — derivável de content_card_events",
  },
  cycleTime: {
    enabled: false,
    description: "Cycle time por status — derivável de content_card_events",
  },
  collaboratorAvg: {
    enabled: false,
    description: "Tempo médio por colaborador — derivável de actor_email nos eventos",
  },
};

export function countByStatusValue(
  byStatus: { status: ContentCardStatus; count: number }[],
  status: ContentCardStatus,
): number {
  return byStatus.find((r) => r.status === status)?.count ?? 0;
}
