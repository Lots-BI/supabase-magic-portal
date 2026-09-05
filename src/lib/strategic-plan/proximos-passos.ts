// Lots BI · Próximos passos — derivação automática v1.

import type {
  MetricRefProgress,
  PlanoAcao,
  PlanoEstrategia,
  PlanoHipotese,
  PlanoOportunidade,
  ProximoPasso,
  EstrategiaEditorialStats,
} from "./types";

export function deriveProximosPassos(input: {
  acoes: PlanoAcao[];
  oportunidades: PlanoOportunidade[];
  hipoteses: PlanoHipotese[];
  estrategias: PlanoEstrategia[];
  editorialStats: Record<string, EstrategiaEditorialStats>;
  metricProgress: MetricRefProgress[];
}): ProximoPasso[] {
  const steps: ProximoPasso[] = [];

  for (const a of input.acoes) {
    if (a.status === "pendente" || a.status === "em_andamento") {
      steps.push({
        titulo: a.titulo,
        origem: a.sugerido ? "acao" : "manual",
        prioridade: a.status === "em_andamento" ? 90 : 70,
        entityRef: { type: "acao", id: a.id },
      });
    }
  }

  for (const o of input.oportunidades) {
    if (o.status === "pendente" || o.status === "em_andamento") {
      steps.push({
        titulo: o.acao_sugerida,
        origem: "oportunidade",
        prioridade: o.origem === "regra" ? 85 : 75,
        entityRef: { type: "oportunidade", id: o.id },
      });
    }
  }

  for (const h of input.hipoteses) {
    if (h.status === "em_teste" && h.resultado_percentual == null && !h.conclusao) {
      steps.push({
        titulo: `Avaliar hipótese: ${h.hipotese.slice(0, 60)}${h.hipotese.length > 60 ? "…" : ""}`,
        origem: "hipotese",
        prioridade: 65,
        entityRef: { type: "hipotese", id: h.id },
      });
    }
  }

  for (const e of input.estrategias) {
    const stats = input.editorialStats[e.id];
    const total = stats?.total ?? 0;
    if (e.peso_percentual >= 20 && total === 0 && e.status !== "concluido") {
      steps.push({
        titulo: `Criar conteúdos para: ${e.titulo}`,
        origem: "estrategia",
        prioridade: Math.round(50 + e.peso_percentual * 0.4),
        entityRef: { type: "estrategia", id: e.id },
      });
    }
  }

  for (const m of input.metricProgress) {
    if (m.meta != null && m.current != null && !m.onTrack) {
      steps.push({
        titulo: `Revisar ${m.label} (${m.platformLabel})`,
        origem: "kpi",
        prioridade: 80,
        entityRef: { type: "metric_ref", id: m.ref.id },
      });
    }
  }

  return steps.sort((a, b) => b.prioridade - a.prioridade).slice(0, 12);
}
