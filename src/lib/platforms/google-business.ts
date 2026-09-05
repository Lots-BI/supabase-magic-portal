// ============================================================================
// Lots BI · Google Business Profile — PlatformDef.
// View: public.vw_google_business_diario
// ============================================================================

import {
  Globe,
  Eye,
  Search,
  MapPin,
  MousePointerClick,
  Phone,
  MessageCircle,
  Image,
  Star,
} from "lucide-react";
import type { PlatformDef } from "./types";
import * as f from "./formulas";

export const googleBusinessDef: PlatformDef = {
  key: "google_business",
  label: "Google Business",
  icon: Globe,
  view: "vw_google_business_diario",
  description: "Performance do perfil Google Business — visualizações, buscas, ações e reputação.",
  questions: [
    "Quantas pessoas viram meu perfil?",
    "Quantas buscas direcionaram ao negócio?",
    "Quantas ações (ligações, rotas, site) foram tomadas?",
    "Como está minha avaliação?",
    "Como evoluiu vs o período anterior?",
  ],
  metrics: [
    {
      key: "profile_views",
      column: "profile_views",
      label: "Visualizações do perfil",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Eye,
      positiveIsGood: true,
    },
    {
      key: "searches",
      column: "searches",
      label: "Buscas",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Search,
      positiveIsGood: true,
    },
    {
      key: "direction_requests",
      column: "direction_requests",
      label: "Pedidos de rota",
      format: "int",
      aggregation: { kind: "sum" },
      icon: MapPin,
      positiveIsGood: true,
    },
    {
      key: "website_clicks",
      column: "website_clicks",
      label: "Cliques no site",
      format: "int",
      aggregation: { kind: "sum" },
      icon: MousePointerClick,
      positiveIsGood: true,
    },
    {
      key: "phone_calls",
      column: "phone_calls",
      label: "Ligações",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Phone,
      positiveIsGood: true,
    },
    {
      key: "messages",
      column: "messages",
      label: "Mensagens",
      format: "int",
      aggregation: { kind: "sum" },
      icon: MessageCircle,
      positiveIsGood: true,
    },
    {
      key: "photo_views",
      column: "photo_views",
      label: "Views de fotos",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Image,
      positiveIsGood: true,
    },
    {
      key: "reviews_count",
      column: "reviews_count",
      label: "Avaliações",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Star,
      positiveIsGood: true,
    },
    {
      key: "reviews_rating",
      column: "reviews_rating",
      label: "Nota média",
      format: "decimal",
      aggregation: { kind: "avg" },
      icon: Star,
      positiveIsGood: true,
      description: "Média das notas reportadas no período.",
    },
  ],
  heroMetrics: ["profile_views", "searches", "website_clicks", "phone_calls"],
  kpis: [
    {
      key: "total_actions",
      label: "Ações totais",
      format: "int",
      positiveIsGood: true,
      compute: (t) =>
        (t.direction_requests ?? 0) +
        (t.website_clicks ?? 0) +
        (t.phone_calls ?? 0) +
        (t.messages ?? 0),
      description: "Rotas + site + ligações + mensagens.",
    },
    {
      key: "actions_per_view",
      label: "Ações por visualização",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => {
        const actions =
          (t.direction_requests ?? 0) +
          (t.website_clicks ?? 0) +
          (t.phone_calls ?? 0) +
          (t.messages ?? 0);
        return f.convRate(actions, t.profile_views ?? 0);
      },
      description: "Taxa de conversão do perfil em ações.",
    },
  ],
  charts: [
    {
      key: "evolucao-visibilidade",
      kind: "area",
      title: "Visualizações e buscas",
      description: "Descoberta do perfil ao longo do período.",
      yMetric: "profile_views",
      series: [
        { metric: "profile_views", label: "Visualizações", tone: "primary" },
        { metric: "searches", label: "Buscas", tone: "secondary" },
      ],
      height: 260,
    },
    {
      key: "evolucao-acoes",
      kind: "area",
      title: "Ações no perfil",
      description: "Interações que geram contato ou visita.",
      yMetric: "website_clicks",
      series: [
        { metric: "website_clicks", label: "Site", tone: "primary" },
        { metric: "phone_calls", label: "Ligações", tone: "secondary" },
        { metric: "direction_requests", label: "Rotas", tone: "success" },
      ],
      height: 240,
    },
  ],
};
