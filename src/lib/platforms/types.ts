// ============================================================================
// Lots BI · Platform Definition contract.
// Cada plataforma de marketing é descrita DECLARATIVAMENTE — métricas brutas,
// estratégias de agregação, KPIs derivados, gráficos e perguntas de negócio.
// Adicionar uma nova plataforma = criar UM PlatformDef + registrar em registry.
// Nenhum componente React precisa ser tocado.
// ============================================================================

import type { LucideIcon } from "lucide-react";
import type { Period } from "@/lib/period";

/** Linhas vindas das views Supabase — shape genérico. */
export type Row = Record<string, unknown> & { data: string; cliente: string };

/** Como agregar uma métrica numérica ao longo do período. */
export type AggStrategy =
  | { kind: "sum" }
  | { kind: "max" }
  | { kind: "min" }
  | { kind: "last" } // último dia não-nulo no período
  | { kind: "first" } // primeiro dia não-nulo
  | { kind: "avg" } // média aritmética dos dias não-nulos
  | { kind: "custom"; fn: (values: number[], rows: Row[], period: Period) => number };

export type ValueFormat = "int" | "currency" | "percent" | "decimal";

export interface MetricDef {
  /** Identificador estável (usado em chaves de chart/tabela). */
  key: string;
  /** Coluna na view Supabase. */
  column: string;
  label: string;
  short?: string;
  format: ValueFormat;
  aggregation: AggStrategy;
  /** Se subir é bom para o negócio (default true). */
  positiveIsGood?: boolean;
  /** Explicação curta — origem/definição oficial. */
  description?: string;
  /** Ícone opcional para card. */
  icon?: LucideIcon;
}

export interface KpiDef {
  key: string;
  label: string;
  format: ValueFormat;
  positiveIsGood: boolean;
  /**
   * Calculado a partir dos TOTAIS já agregados do período.
   * NUNCA média de médias — sempre fórmula oficial sobre os totais.
   */
  compute: (totals: Record<string, number>, period: Period) => number;
  description?: string;
  icon?: LucideIcon;
}

export type ChartTone = "primary" | "secondary" | "success" | "neutral";

export interface ChartSeriesRef {
  /** chave da métrica (MetricDef.key) — extraída da série diária. */
  metric: string;
  label: string;
  tone: ChartTone;
}

export interface ChartDef {
  key: string;
  kind: "area" | "bar";
  title: string;
  description?: string;
  series: ChartSeriesRef[];
  /** Métrica usada para formatar o eixo Y. */
  yMetric: string;
  height?: number;
}

export interface PlatformDef {
  key: string;
  label: string;
  icon: LucideIcon;
  /** View Supabase de leitura (uma linha por dia/cliente[/campanha]). */
  view: string;
  /** Coluna com nome da campanha — habilita ranking quando presente. */
  campaignField?: string;
  /** Métricas brutas (exibidas em cards e disponíveis no engine). */
  metrics: MetricDef[];
  /** Métricas em destaque nos cards do topo (subset de metrics.key). */
  heroMetrics: string[];
  /** KPIs derivados — calculados sobre os totais. */
  kpis: KpiDef[];
  /** Gráficos a renderizar (cada um vira uma seção). */
  charts: ChartDef[];
  /** Perguntas de negócio que esta página responde — header narrativo. */
  questions: string[];
  /** Descrição curta do que esta página entrega. */
  description: string;
}
