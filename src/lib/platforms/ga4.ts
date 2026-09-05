// ============================================================================
// Lots BI · Google Analytics 4 — PlatformDef.
// View: public.vw_ga4_diario
// Colunas: data, cliente, active_users, sessions, engaged_sessions, pageviews,
//          event_count, conversions, engagement_rate.
// ============================================================================

import { LineChart, Users, Activity, MousePointerClick, Eye, Target, Sparkles } from "lucide-react";
import type { PlatformDef } from "./types";
import * as f from "./formulas";

export const ga4Def: PlatformDef = {
  key: "ga4",
  label: "Google Analytics 4",
  icon: LineChart,
  view: "vw_ga4_diario",
  description:
    "Comportamento do tráfego — usuários, sessões, eventos, páginas e conversões do site.",
  questions: [
    "Quantos usuários ativos eu tive?",
    "Quantas sessões e quantas foram engajadas?",
    "Quantas páginas vistas em média por usuário?",
    "Quantos eventos por sessão?",
    "Qual a taxa de conversão sobre sessões e usuários?",
    "Como tudo evoluiu vs o período anterior?",
  ],
  metrics: [
    {
      key: "active_users",
      column: "active_users",
      label: "Usuários ativos",
      format: "int",
      aggregation: { kind: "max" },
      icon: Users,
      positiveIsGood: true,
      description:
        "Maior valor diário de usuários ativos no período (aproximação; GA4 reporta por dia).",
    },
    {
      key: "sessions",
      column: "sessions",
      label: "Sessões",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Activity,
      positiveIsGood: true,
    },
    {
      key: "engaged_sessions",
      column: "engaged_sessions",
      label: "Sessões engajadas",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Sparkles,
      positiveIsGood: true,
    },
    {
      key: "pageviews",
      column: "pageviews",
      label: "Visualizações",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Eye,
      positiveIsGood: true,
    },
    {
      key: "event_count",
      column: "event_count",
      label: "Eventos",
      format: "int",
      aggregation: { kind: "sum" },
      icon: MousePointerClick,
      positiveIsGood: true,
    },
    {
      key: "conversions",
      column: "conversions",
      label: "Conversões",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Target,
      positiveIsGood: true,
    },
  ],
  heroMetrics: ["active_users", "sessions", "pageviews", "conversions"],
  kpis: [
    {
      key: "engagement_rate",
      label: "Engagement rate",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => f.convRate(t.engaged_sessions, t.sessions),
      description: "Engaged sessions ÷ Sessions × 100.",
    },
    {
      key: "events_per_session",
      label: "Eventos por sessão",
      format: "decimal",
      positiveIsGood: true,
      compute: (t) => f.eventsPerSession(t.event_count, t.sessions),
      description: "Event count ÷ Sessions.",
    },
    {
      key: "views_per_user",
      label: "Visualizações por usuário",
      format: "decimal",
      positiveIsGood: true,
      compute: (t) => f.viewsPerUser(t.pageviews, t.active_users),
      description: "Pageviews ÷ Active users.",
    },
    {
      key: "conv_per_session",
      label: "Conversão por sessão",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => f.convRate(t.conversions, t.sessions),
      description: "Conversions ÷ Sessions × 100.",
    },
    {
      key: "conv_per_user",
      label: "Conversão por usuário",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => f.convRate(t.conversions, t.active_users),
      description: "Conversions ÷ Active users × 100.",
    },
  ],
  charts: [
    {
      key: "evolucao-trafego",
      kind: "area",
      title: "Usuários e sessões",
      description: "Comportamento diário de audiência.",
      yMetric: "sessions",
      series: [
        { metric: "active_users", label: "Usuários ativos", tone: "primary" },
        { metric: "sessions", label: "Sessões", tone: "secondary" },
      ],
      height: 260,
    },
    {
      key: "evolucao-engajamento",
      kind: "area",
      title: "Eventos, visualizações e conversões",
      description: "Profundidade de interação por dia.",
      yMetric: "event_count",
      series: [
        { metric: "pageviews", label: "Visualizações", tone: "secondary" },
        { metric: "event_count", label: "Eventos", tone: "primary" },
        { metric: "conversions", label: "Conversões", tone: "success" },
      ],
      height: 240,
    },
  ],
};
