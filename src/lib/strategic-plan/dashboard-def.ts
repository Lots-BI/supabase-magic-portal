// Lots BI · Definição declarativa das seções do Centro Estratégico.

export const DIAGNOSTICO_THRESHOLDS = {
  spendUp: 5,
  ctrDown: -5,
  conversionsStable: 3,
  engagementDown: -5,
  reachUp: 5,
  cpaOverMetaPct: 10,
} as const;

export const CENTRO_ESTRATEGICO_SECTIONS = [
  { id: "diagnostico", label: "Diagnóstico Atual", auto: true },
  { id: "radar", label: "Radar Executivo", auto: true },
  { id: "objetivos", label: "Objetivos ativos", auto: false },
  { id: "hipoteses", label: "Hipóteses", auto: false },
  { id: "estrategias", label: "Estratégias", auto: false },
  { id: "oportunidades", label: "Oportunidades", auto: true },
  { id: "roadmap", label: "Roadmap", auto: false },
  { id: "decisoes", label: "Decisões", auto: false },
  { id: "aprendizados", label: "Aprendizados", auto: false },
  { id: "kpis", label: "KPIs e alertas", auto: true },
  { id: "timeline", label: "Timeline", auto: true },
  { id: "proximos_passos", label: "Próximos Passos", auto: true },
] as const;

export type CentroSectionId = (typeof CENTRO_ESTRATEGICO_SECTIONS)[number]["id"];
