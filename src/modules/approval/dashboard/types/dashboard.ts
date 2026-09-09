import type { ContentCardStatus } from "../../types/content-card";

export type DashboardStatusCount = {
  status: ContentCardStatus;
  count: number;
};

export type DashboardClientCount = {
  cadastro_cliente_id: number;
  cliente_nome: string;
  count: number;
};

export type DashboardResponsavelCount = {
  responsavel_email: string;
  count: number;
};

export type StageAverageMs = {
  stageKey: string;
  label: string;
  averageMs: number | null;
  sampleSize: number;
};

/** Estrutura preparatória — sem integrações externas (Fase 4). */
export type WorkflowMetricsFramework = {
  sla: {
    enabled: false;
    description: string;
  };
  leadTime: {
    enabled: false;
    description: string;
  };
  cycleTime: {
    enabled: false;
    description: string;
  };
  collaboratorAvg: {
    enabled: false;
    description: string;
  };
};

export type OpsDashboardData = {
  totalCards: number;
  byStatus: DashboardStatusCount[];
  byClient: DashboardClientCount[];
  byResponsavel: DashboardResponsavelCount[];
  publishedCount: number;
  archivedCount: number;
  overdueCount: number;
  publishedThisWeek: number;
  awaitingApproval: number;
  changesRequested: number;
  stageAverages: StageAverageMs[];
  metricsFramework: WorkflowMetricsFramework;
};
