import { DollarSign, Eye, Music2, TrendingUp } from "lucide-react";
import type { PlatformDef } from "./types";
import * as f from "./formulas";

export const tiktokDef: PlatformDef = {
  key: "tiktok",
  label: "TikTok",
  icon: Music2,
  view: "vw_tiktok_diario",
  campaignField: "campanha",
  description: "Performance das campanhas TikTok Ads — investimento e impressões.",
  questions: [
    "Quanto eu investi no período?",
    "Quantas impressões as campanhas entregaram?",
    "Qual o CPM?",
    "Qual campanha gastou mais?",
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
    },
    {
      key: "impressions",
      column: "impressions",
      label: "Impressões",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Eye,
      positiveIsGood: true,
    },
  ],
  heroMetrics: ["spend", "impressions"],
  kpis: [
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
      yMetric: "spend",
      series: [{ metric: "spend", label: "Investimento", tone: "primary" }],
      height: 260,
    },
    {
      key: "evolucao-impressoes",
      kind: "area",
      title: "Impressões",
      yMetric: "impressions",
      series: [{ metric: "impressions", label: "Impressões", tone: "secondary" }],
      height: 240,
    },
  ],
};
