// Lots BI · Plano Estratégico — tipos canônicos (espelham migrations-official/11).

export const PLANO_STATUS = ["rascunho", "ativo", "pausado", "concluido", "arquivado"] as const;
export type PlanoStatus = (typeof PLANO_STATUS)[number];

export const PLANO_PRIORIDADE = ["alta", "media", "baixa"] as const;
export type PlanoPrioridade = (typeof PLANO_PRIORIDADE)[number];

export const PLANO_ITEM_STATUS = ["pendente", "em_andamento", "concluido", "cancelado"] as const;
export type PlanoItemStatus = (typeof PLANO_ITEM_STATUS)[number];

export const PLANO_EVENTO_TIPO = [
  "criacao",
  "edicao",
  "comentario",
  "conclusao",
  "mudanca_meta",
  "mudanca_responsavel",
  "mudanca_status",
  "decisao",
  "aprendizado",
  "proposta_edicao",
] as const;
export type PlanoEventoTipo = (typeof PLANO_EVENTO_TIPO)[number];

export const HIPOTESE_STATUS = ["aberta", "em_teste", "validada", "invalidada"] as const;
export type HipoteseStatus = (typeof HIPOTESE_STATUS)[number];

export const OPORTUNIDADE_ORIGEM = ["manual", "regra", "ia"] as const;
export type OportunidadeOrigem = (typeof OPORTUNIDADE_ORIGEM)[number];

export const DECISAO_RESULTADO_STATUS = ["pendente", "positivo", "negativo", "neutro"] as const;
export type DecisaoResultadoStatus = (typeof DECISAO_RESULTADO_STATUS)[number];

export const ROADMAP_MARCO_TIPO = ["inicio", "semana", "marco", "conclusao"] as const;
export type RoadmapMarcoTipo = (typeof ROADMAP_MARCO_TIPO)[number];

export interface PlanoEstrategico {
  id: string;
  cadastro_cliente_id: number;
  cliente_nome: string;
  titulo: string;
  descricao: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  status: PlanoStatus;
  objetivo_principal: string | null;
  observacoes: string | null;
  ai_metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanoObjetivo {
  id: string;
  plano_id: string;
  titulo: string;
  descricao: string | null;
  meta_numerica: number | null;
  data_alvo: string | null;
  periodo_inicio: string | null;
  workflow_fase: string | null;
  progresso_manual: number | null;
  status: PlanoItemStatus;
  ordem: number;
  created_at: string;
  updated_at: string;
  estrategia_ids?: string[];
}

export interface PlanoEstrategia {
  id: string;
  plano_id: string;
  objetivo_id: string | null;
  titulo: string;
  descricao: string | null;
  prioridade: PlanoPrioridade;
  peso_percentual: number;
  status: PlanoItemStatus;
  responsavel_email: string | null;
  data_prevista: string | null;
  comentarios: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PlanoMetricRef {
  id: string;
  plano_id: string;
  objetivo_id: string | null;
  platform_key: string;
  metric_key: string | null;
  kpi_key: string | null;
  meta_numerica: number | null;
  positive_is_good: boolean;
  created_at: string;
}

export interface PlanoHipotese {
  id: string;
  plano_id: string;
  objetivo_id: string | null;
  estrategia_id: string | null;
  hipotese: string;
  status: HipoteseStatus;
  resultado_percentual: number | null;
  resultado_texto: string | null;
  conclusao: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PlanoOportunidade {
  id: string;
  plano_id: string;
  platform_key: string | null;
  insight: string;
  acao_sugerida: string;
  origem: OportunidadeOrigem;
  status: PlanoItemStatus;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PlanoDecisao {
  id: string;
  plano_id: string;
  estrategia_id: string | null;
  titulo: string;
  motivo: string;
  responsavel_email: string | null;
  resultado_texto: string | null;
  resultado_status: DecisaoResultadoStatus;
  data_decisao: string;
  created_at: string;
  updated_at: string;
}

export interface PlanoAprendizado {
  id: string;
  plano_id: string;
  mes_referencia: string;
  titulo: string;
  descricao: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PlanoRoadmapMarco {
  id: string;
  plano_id: string;
  objetivo_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: RoadmapMarcoTipo;
  semana_numero: number | null;
  data_prevista: string | null;
  status: PlanoItemStatus;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PlanoAcao {
  id: string;
  plano_id: string;
  estrategia_id: string | null;
  titulo: string;
  descricao: string | null;
  motivo_estrategico: string;
  responsavel_email: string | null;
  data_prevista: string | null;
  status: PlanoItemStatus;
  sugerido: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PlanoEvento {
  id: string;
  plano_id: string;
  entity_type: string | null;
  entity_id: string | null;
  tipo: PlanoEventoTipo;
  autor_id: string | null;
  autor_email: string | null;
  mensagem: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface EstrategiaEditorialStats {
  estrategia_id: string;
  total: number;
  publicados: number;
  aprovados: number;
  aguardando: number;
  em_producao: number;
  rascunho: number;
}

export interface MetricRefProgress {
  ref: PlanoMetricRef;
  label: string;
  platformLabel: string;
  current: number | null;
  meta: number | null;
  pct: number | null;
  delta: number | null;
  onTrack: boolean;
}

export interface DiagnosticoInsight {
  platform: string;
  platformLabel: string;
  narrative: string;
  direction: "up" | "down" | "stable";
  severity: "info" | "warning" | "success";
}

export interface ProximoPasso {
  titulo: string;
  origem: "acao" | "oportunidade" | "hipotese" | "estrategia" | "kpi" | "manual";
  prioridade: number;
  entityRef?: { type: string; id: string };
}

export interface StrategicAlert {
  id: string;
  message: string;
  severity: "info" | "warning" | "danger";
}

export interface RadarAxis {
  label: string;
  value: number;
  peso: number;
}

/** Prep IA — não usado na v1. */
export interface AiInsight {
  provider: string;
  confidence: number;
  payload: Record<string, unknown>;
  status: "pending" | "accepted" | "dismissed";
}

export interface PlanoDetail {
  plano: PlanoEstrategico;
  objetivos: PlanoObjetivo[];
  estrategias: PlanoEstrategia[];
  metricRefs: PlanoMetricRef[];
  hipoteses: PlanoHipotese[];
  oportunidades: PlanoOportunidade[];
  decisoes: PlanoDecisao[];
  aprendizados: PlanoAprendizado[];
  roadmap: PlanoRoadmapMarco[];
  acoes: PlanoAcao[];
  eventos: PlanoEvento[];
}

export interface StrategicDashboardPayload {
  plano: PlanoEstrategico;
  objetivoAtual:
    | (PlanoObjetivo & {
        estrategias: PlanoEstrategia[];
        metricProgress: MetricRefProgress[];
        progressPct: number | null;
        fase: string;
        proximaMeta: MetricRefProgress | null;
      })
    | null;
  objetivos: (PlanoObjetivo & {
    estrategias: PlanoEstrategia[];
    metricProgress: MetricRefProgress[];
    progressPct: number | null;
    fase: string;
  })[];
  estrategias: (PlanoEstrategia & { editorialStats: EstrategiaEditorialStats })[];
  hipoteses: PlanoHipotese[];
  oportunidades: PlanoOportunidade[];
  oportunidadesRegra: PlanoOportunidade[];
  decisoes: PlanoDecisao[];
  aprendizados: PlanoAprendizado[];
  roadmap: PlanoRoadmapMarco[];
  acoes: PlanoAcao[];
  eventos: PlanoEvento[];
  diagnostico: DiagnosticoInsight[];
  radar: RadarAxis[];
  metricProgress: MetricRefProgress[];
  alerts: StrategicAlert[];
  proximosPassos: ProximoPasso[];
  needsPrimeiroObjetivo: boolean;
  suggestProximoObjetivo: boolean;
}

// ---------- Alinhamento estratégico (funil quiz → plano) ----------

export const QUIZ_OBJETIVO_PRINCIPAL = ["vendas", "branding", "leads"] as const;
export type QuizObjetivoPrincipal = (typeof QUIZ_OBJETIVO_PRINCIPAL)[number];

export interface QuizData {
  momentoNegocio: string;
  objetivoPrincipal: QuizObjetivoPrincipal;
  temSite: boolean;
  temDominio: boolean;
  investeTrafego: boolean;
  posicionamentoRedes: string;
  verbaAdsMensal: string;
  cienteCustosInfra: boolean;
}

export interface PlanData {
  resumoEstrategia: string;
  feeAgencia: number;
  verbaTrafego: number;
  custosInfra: number;
  itensEntrega?: string[];
}

export interface PlanoAlinhamento {
  id: string;
  cadastro_cliente_id: number;
  cliente_nome: string;
  quiz_completed_at: string | null;
  quiz_data: QuizData | null;
  has_active_plan: boolean;
  plan_data: PlanData | null;
  plan_approved_at: string | null;
  plano_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AlinhamentoUiState = "quiz" | "pending" | "active";

export interface AlinhamentoJourney {
  hasCompletedQuiz: boolean;
  quizData: QuizData | null;
  hasActivePlan: boolean;
  planData: PlanData | null;
  planApprovedAt: string | null;
  alinhamento: PlanoAlinhamento | null;
  uiState: AlinhamentoUiState;
  /** Plano operacional legado/paralelo (Centro Estratégico), se existir. */
  legadoPlanoId: string | null;
}
