// Lots BI · Snapshots do plano estratégico (versionamento colaborativo).

import type { PlanoDetail } from "./types";

export function serializePlanoSnapshot(detail: PlanoDetail): Record<string, unknown> {
  return {
    plano: detail.plano,
    objetivos: detail.objetivos,
    estrategias: detail.estrategias,
    metricRefs: detail.metricRefs,
    hipoteses: detail.hipoteses,
    oportunidades: detail.oportunidades,
    decisoes: detail.decisoes,
    aprendizados: detail.aprendizados,
    roadmap: detail.roadmap,
    acoes: detail.acoes,
  };
}
