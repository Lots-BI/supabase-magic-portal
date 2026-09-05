// ============================================================================
// Lots BI · Google Ads — PlatformDef.
// View: public.vw_google_ads_diario
// Colunas: data, cliente, campanha, impressions, clicks, spend, ctr, cpc, cpm.
// Conversions ainda não chegam nesta view — quando chegarem, basta declarar
// uma nova MetricDef + KPIs (CPA, ConvRate) sem mexer em nenhum componente.
// ============================================================================

import {
  BarChart3,
  DollarSign,
  MousePointerClick,
  Eye,
  Target,
  Activity,
  TrendingUp,
} from "lucide-react";
import type { PlatformDef } from "./types";
import * as f from "./formulas";

export const googleAdsDef: PlatformDef = {
  key: "google_ads",
  label: "Google Ads",
  icon: BarChart3,
  view: "vw_google_ads_diario",
  campaignField: "campanha",
  description:
    "Performance da conta Google Ads — investimento, alcance pago e eficiência por campanha.",
  questions: [
    "Quanto eu investi no período?",
    "Quantas pessoas foram impactadas?",
    "Quantos cliques eu recebi?",
    "Quanto custou cada clique e cada mil impressões?",
    "Qual campanha entregou o melhor resultado?",
    "Como tudo evoluiu vs o período anterior?",
  ],
  metrics: [
    {
      key: "spend",
      column: "spend",
      label: "Investimento",
      format: "currency",
      aggregation: { kind: "sum" },
      icon: DollarSign,
      positiveIsGood: true,
      description: "Somatório do gasto declarado pelo Google Ads no período.",
    },
    {
      key: "impressions",
      column: "impressions",
      label: "Impressões",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Eye,
      positiveIsGood: true,
      description: "Total de impressões servidas pelas campanhas no período.",
    },
    {
      key: "clicks",
      column: "clicks",
      label: "Cliques",
      format: "int",
      aggregation: { kind: "sum" },
      icon: MousePointerClick,
      positiveIsGood: true,
      description: "Cliques registrados nas campanhas.",
    },
  ],
  heroMetrics: ["spend", "impressions", "clicks"],
  kpis: [
    {
      key: "ctr",
      label: "CTR",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => f.ctr(t.impressions, t.clicks),
      icon: Target,
      description: "Clicks ÷ Impressions × 100.",
    },
    {
      key: "cpc",
      label: "CPC médio",
      format: "currency",
      positiveIsGood: false,
      compute: (t) => f.cpc(t.spend, t.clicks),
      icon: Activity,
      description: "Spend ÷ Clicks.",
    },
    {
      key: "cpm",
      label: "CPM médio",
      format: "currency",
      positiveIsGood: false,
      compute: (t) => f.cpm(t.spend, t.impressions),
      icon: TrendingUp,
      description: "Spend ÷ Impressions × 1000.",
    },
  ],
  charts: [
    {
      key: "evolucao-investimento",
      kind: "area",
      title: "Evolução do investimento",
      description: "Gasto diário consolidado no período.",
      yMetric: "spend",
      series: [{ metric: "spend", label: "Investimento", tone: "primary" }],
      height: 260,
    },
    {
      key: "evolucao-trafego",
      kind: "area",
      title: "Impressões e cliques",
      description: "Volume de mídia entregue por dia.",
      yMetric: "impressions",
      series: [
        { metric: "impressions", label: "Impressões", tone: "secondary" },
        { metric: "clicks", label: "Cliques", tone: "success" },
      ],
      height: 240,
    },
  ],
};
