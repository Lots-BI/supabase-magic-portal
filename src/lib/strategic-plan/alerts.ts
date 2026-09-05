// Lots BI · Alertas operacionais do plano estratégico.

import type {
  MetricRefProgress,
  PlanoAcao,
  PlanoEstrategia,
  PlanoObjetivo,
  StrategicAlert,
} from "./types";

export function buildAlerts(input: {
  objetivos: PlanoObjetivo[];
  estrategias: PlanoEstrategia[];
  acoes: PlanoAcao[];
  metricProgress: MetricRefProgress[];
  today?: string;
}): StrategicAlert[] {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const alerts: StrategicAlert[] = [];

  for (const o of input.objetivos) {
    if (o.data_alvo && o.data_alvo < today && o.status !== "concluido") {
      alerts.push({
        id: `obj-prazo-${o.id}`,
        message: `Objetivo "${o.titulo}" passou da data alvo`,
        severity: "warning",
      });
    }
  }

  for (const e of input.estrategias) {
    if (e.data_prevista && e.data_prevista < today && e.status !== "concluido") {
      alerts.push({
        id: `est-prazo-${e.id}`,
        message: `Estratégia "${e.titulo}" com prazo vencido`,
        severity: "warning",
      });
    }
    const hasAcao = input.acoes.some(
      (a) => a.estrategia_id === e.id && a.status !== "concluido" && a.status !== "cancelado",
    );
    if (!hasAcao && e.status !== "concluido" && e.status !== "cancelado") {
      alerts.push({
        id: `est-sem-acao-${e.id}`,
        message: `Estratégia "${e.titulo}" sem ações vinculadas`,
        severity: "info",
      });
    }
  }

  for (const m of input.metricProgress) {
    if (m.current == null) {
      alerts.push({
        id: `kpi-sem-dados-${m.ref.id}`,
        message: `Sem dados para ${m.label} (${m.platformLabel}) no período`,
        severity: "info",
      });
    } else if (m.meta != null && !m.onTrack) {
      alerts.push({
        id: `kpi-meta-${m.ref.id}`,
        message: `${m.label} abaixo da meta (${m.platformLabel})`,
        severity: "danger",
      });
    }
  }

  const pesoSum = input.estrategias.reduce((s, e) => s + Number(e.peso_percentual), 0);
  if (input.estrategias.length > 0 && Math.abs(pesoSum - 100) > 5) {
    alerts.push({
      id: "peso-sum",
      message: `Soma dos pesos das estratégias: ${pesoSum.toFixed(0)}% (ideal ≈ 100%)`,
      severity: "info",
    });
  }

  return alerts;
}
