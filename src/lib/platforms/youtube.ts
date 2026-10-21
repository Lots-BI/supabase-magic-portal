import { Eye, Play, Youtube } from "lucide-react";
import type { PlatformDef } from "./types";
import * as f from "./formulas";

export const youtubeDef: PlatformDef = {
  key: "youtube",
  label: "YouTube",
  icon: Youtube,
  view: "vw_youtube_diario",
  description: "Visualizações e impressões do canal no YouTube Analytics.",
  questions: [
    "Quantas visualizações o canal teve?",
    "Quantas impressões o YouTube serviu?",
    "Qual a taxa de visualização sobre impressões?",
  ],
  metrics: [
    {
      key: "views",
      column: "views",
      label: "Visualizações",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Play,
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
  heroMetrics: ["views", "impressions"],
  kpis: [
    {
      key: "views_per_impression",
      label: "Views por impressão",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => f.convRate(t.views, t.impressions),
      description: "Visualizações ÷ impressões × 100.",
    },
  ],
  charts: [
    {
      key: "evolucao-views",
      kind: "area",
      title: "Visualizações e impressões",
      yMetric: "views",
      series: [
        { metric: "views", label: "Visualizações", tone: "primary" },
        { metric: "impressions", label: "Impressões", tone: "secondary" },
      ],
      height: 260,
    },
  ],
};
