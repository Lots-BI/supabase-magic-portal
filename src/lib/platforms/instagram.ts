// ============================================================================
// Lots BI · Instagram — PlatformDef.
// View: public.vw_instagram_diario
// Colunas: data, cliente, reach, interactions, accounts_engaged, likes,
//          comments, saves, shares, profile_links_taps, engagement_rate.
//
// Decisão importante: a estratégia de agregação de reach e accounts_engaged
// é DECLARADA aqui (não embutida no engine). Hoje usamos MAX como melhor
// aproximação para contas únicas, mas qualquer ajuste futuro (SUM, LAST,
// CUSTOM) é feito alterando APENAS o MetricDef — nenhum componente.
// ============================================================================

import {
  Instagram,
  Heart,
  Users,
  MessageCircle,
  Bookmark,
  Share2,
  ExternalLink,
  Activity,
  TrendingUp,
} from "lucide-react";
import type { PlatformDef } from "./types";
import * as f from "./formulas";

export const instagramDef: PlatformDef = {
  key: "instagram",
  label: "Instagram",
  icon: Instagram,
  view: "vw_instagram_diario",
  description:
    "Performance orgânica do perfil — alcance, engajamento e ações realizadas pelo público.",
  questions: [
    "Quantas pessoas únicas eu alcancei?",
    "Quantas contas se engajaram comigo?",
    "Qual a taxa de engajamento sobre o alcance?",
    "Como evoluíram likes, comentários e salvamentos?",
    "Quantas pessoas tocaram nos links do perfil?",
    "Como tudo evoluiu vs o período anterior?",
  ],
  metrics: [
    // Métricas não-acumulativas — estratégia EXPLÍCITA, fácil de revisar.
    {
      key: "reach",
      column: "reach",
      label: "Alcance",
      format: "int",
      aggregation: { kind: "max" },
      icon: Users,
      positiveIsGood: true,
      description: "Contas únicas alcançadas. Estratégia: MAX no período (revisável).",
    },
    {
      key: "accounts_engaged",
      column: "accounts_engaged",
      label: "Contas engajadas",
      format: "int",
      aggregation: { kind: "max" },
      icon: Heart,
      positiveIsGood: true,
      description: "Contas únicas que interagiram. Estratégia: MAX no período (revisável).",
    },
    // Acumulativas — SUM.
    {
      key: "interactions",
      column: "interactions",
      label: "Interações",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Activity,
      positiveIsGood: true,
      description: "Total de interações (somatório diário).",
    },
    {
      key: "likes",
      column: "likes",
      label: "Curtidas",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Heart,
      positiveIsGood: true,
    },
    {
      key: "comments",
      column: "comments",
      label: "Comentários",
      format: "int",
      aggregation: { kind: "sum" },
      icon: MessageCircle,
      positiveIsGood: true,
    },
    {
      key: "saves",
      column: "saves",
      label: "Salvamentos",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Bookmark,
      positiveIsGood: true,
    },
    {
      key: "shares",
      column: "shares",
      label: "Compartilhamentos",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Share2,
      positiveIsGood: true,
    },
    {
      key: "profile_links_taps",
      column: "profile_links_taps",
      label: "Toques no link",
      format: "int",
      aggregation: { kind: "sum" },
      icon: ExternalLink,
      positiveIsGood: true,
    },
  ],
  heroMetrics: ["reach", "accounts_engaged", "interactions", "profile_links_taps"],
  kpis: [
    {
      key: "engagement_rate",
      label: "Taxa de engajamento",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => f.engagementRate(t.interactions, t.reach),
      description: "Interactions ÷ Reach × 100.",
    },
    {
      key: "media_diaria_interacoes",
      label: "Média diária de interações",
      format: "decimal",
      positiveIsGood: true,
      compute: (t, period) => f.dailyAverage(t.interactions, period.days),
      description: "Interações totais ÷ dias do período.",
      icon: TrendingUp,
    },
  ],
  charts: [
    {
      key: "evolucao-alcance",
      kind: "area",
      title: "Alcance e contas engajadas",
      description: "Métricas únicas reportadas pelo Instagram, por dia.",
      yMetric: "reach",
      series: [
        { metric: "reach", label: "Alcance", tone: "primary" },
        { metric: "accounts_engaged", label: "Contas engajadas", tone: "secondary" },
      ],
      height: 260,
    },
    {
      key: "evolucao-interacoes",
      kind: "area",
      title: "Interações",
      description: "Curtidas, comentários, salvamentos e compartilhamentos.",
      yMetric: "interactions",
      series: [
        { metric: "likes", label: "Curtidas", tone: "primary" },
        { metric: "comments", label: "Comentários", tone: "secondary" },
        { metric: "saves", label: "Salvamentos", tone: "success" },
        { metric: "shares", label: "Compartilhamentos", tone: "neutral" },
      ],
      height: 240,
    },
  ],
};
