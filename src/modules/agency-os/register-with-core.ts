import { lazy } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  Compass,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  Palette,
  SwatchBook,
  Users,
} from "lucide-react";
import { configRegistry } from "@/modules/core/registry/config-registry";
import { DOMAIN_EVENTS } from "@/modules/core/types/domain-events";
import type { ModuleRouteDef } from "@/modules/core/types/module-config";
import type { SearchContext, SearchResult } from "@/modules/core/types/search";
import { registerAgencyOsCommands } from "./commands/register-commands";
import { wireAgencyOsEventSubscribers } from "./events/wire-subscribers";
import { searchAgencyOs } from "./intelligence/services/search-agency-os";
import { agencyClientRepository } from "./repositories/client.repository.server";
import { agencyLeadRepository } from "./repositories/lead.repository.server";
import { agencyProjectRepository } from "./repositories/project.repository.server";
import { agencyTaskRepository } from "./repositories/task.repository.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FEATURE_PLANO_ESTRATEGICO_NAV } from "@/lib/feature-flags";

const NAVIGATION_ROUTES: ModuleRouteDef[] = [
  {
    id: "dashboard",
    label: "Dashboards",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "painel", "métricas", "visão geral", "plataformas"],
  },
  {
    id: "aprovacoes",
    label: "Aprovações pendentes",
    href: "/aprovacoes",
    icon: ClipboardCheck,
    keywords: ["posts", "conteúdo", "aprovar"],
  },
  // Arquivado — reativar com FEATURE_PLANO_ESTRATEGICO_NAV
  ...(FEATURE_PLANO_ESTRATEGICO_NAV
    ? [
        {
          id: "plano-estrategico",
          label: "Plano Estratégico",
          href: "/plano-estrategico",
          icon: Compass,
          keywords: ["estratégia", "objetivos", "centro estratégico"],
        } satisfies ModuleRouteDef,
      ]
    : []),
  {
    id: "admin",
    label: "Admin — Visão geral",
    href: "/admin",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    id: "central",
    label: "Central — Agency OS",
    href: "/admin/central",
    icon: Building2,
    adminOnly: true,
    keywords: ["operações", "agência", "crm", "prioridades", "pipeline", "workspace"],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    href: "/admin/relatorios",
    icon: FileBarChart,
    adminOnly: true,
    keywords: ["export", "pdf"],
  },
  {
    id: "aprovacoes-kanban",
    label: "Aprovações (Kanban)",
    href: "/admin/aprovacoes",
    icon: ClipboardCheck,
    adminOnly: true,
    keywords: ["kanban", "conteúdo", "produção", "workflow", "calendário", "editorial"],
  },
  {
    id: "brandbook",
    label: "Diretrizes da Marca",
    href: "/admin/brandbook",
    icon: SwatchBook,
    adminOnly: true,
    keywords: ["marca", "identidade", "pdf", "manual", "guia visual", "brandbook", "diretrizes"],
  },
  ...(FEATURE_PLANO_ESTRATEGICO_NAV
    ? [
        {
          id: "plano-admin",
          label: "Plano Estratégico (admin)",
          href: "/admin/plano-estrategico",
          icon: Compass,
          adminOnly: true,
          keywords: ["estratégia", "objetivos"],
        } satisfies ModuleRouteDef,
      ]
    : []),
  {
    id: "clientes",
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
    adminOnly: true,
  },
  {
    id: "usuarios",
    label: "Usuários",
    href: "/admin/usuarios",
    icon: Users,
    adminOnly: true,
  },
  {
    id: "tutorial-admin",
    label: "Tutorial da plataforma",
    href: "/admin/tutorial",
    icon: GraduationCap,
    adminOnly: true,
    keywords: ["ajuda", "guia", "como usar", "onboarding", "passo a passo"],
  },
  {
    id: "tutorial-client",
    label: "Tutorial (cliente)",
    href: "/tutorial",
    icon: GraduationCap,
    keywords: ["ajuda", "guia", "como usar", "onboarding"],
  },
  {
    id: "knowledge",
    label: "Knowledge Center",
    href: "/admin/knowledge",
    icon: BookOpen,
    adminOnly: true,
    keywords: ["docs", "documentação"],
  },
  {
    id: "branding",
    label: "Branding Lots BI",
    href: "/admin/branding",
    icon: Palette,
    adminOnly: true,
    keywords: ["cores", "logo", "identidade", "marca", "hex"],
  },
  {
    id: "metricas",
    label: "Métricas — glossário",
    href: "/admin/knowledge",
    icon: BarChart3,
    keywords: ["ctr", "cpa", "cpc", "alcance", "sessões", "conversões"],
  },
];

function navigationSearch(ctx: SearchContext): SearchResult[] {
  const needle = ctx.query.trim().toLowerCase();
  const routes = NAVIGATION_ROUTES.filter((r) => !r.adminOnly || ctx.isAdmin);
  const filtered = needle
    ? routes.filter((r) => {
        const hay = [r.label, ...(r.keywords ?? [])].join(" ").toLowerCase();
        return hay.includes(needle);
      })
    : routes;

  return filtered.map((r) => ({
    id: `nav-${r.id}`,
    label: r.label,
    href: r.href,
    group: "Navegação",
    score: 10,
  }));
}

const HealthDiagnosisWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/IntelligenceWidgets").then((m) => ({
    default: m.HealthDiagnosisWidget,
  })),
);
const InsightsWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/IntelligenceWidgets").then((m) => ({
    default: m.InsightsWidget,
  })),
);
const RecommendationsWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/IntelligenceWidgets").then((m) => ({
    default: m.RecommendationsWidget,
  })),
);
const PerformanceWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/IntelligenceWidgets").then((m) => ({
    default: m.PerformanceWidget,
  })),
);
const FinanceWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/IntelligenceWidgets").then((m) => ({
    default: m.FinanceWidget,
  })),
);
const CampaignsWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/IntelligenceWidgets").then((m) => ({
    default: m.CampaignsWidget,
  })),
);
const ProjectsWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/ProjectsWidget").then((m) => ({
    default: m.ProjectsWidget,
  })),
);
const NotesWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/NotesWidget").then((m) => ({
    default: m.NotesWidget,
  })),
);
const TimelineWidget = lazy(() =>
  import("@/components/lotus/agency-os/workspace/TimelineWidget").then((m) => ({
    default: m.TimelineWidget,
  })),
);

const AGENCY_MODULE_KEY = Symbol.for("lots.bi.agencyOsModule");

export function registerAgencyOsModule(): void {
  registerAgencyOsCommands();

  const g = globalThis as typeof globalThis & { [AGENCY_MODULE_KEY]?: boolean };
  if (g[AGENCY_MODULE_KEY]) return;
  g[AGENCY_MODULE_KEY] = true;

  wireAgencyOsEventSubscribers();

  configRegistry.register({
    id: "agency-os",
    label: "Agency OS",
    routes: NAVIGATION_ROUTES.filter((r) => r.id === "central"),
    permissions: ["agency:read", "agency:write", "agency:pipeline"],
    events: [
      DOMAIN_EVENTS.CLIENT_CREATED,
      DOMAIN_EVENTS.PROJECT_MOVED,
      DOMAIN_EVENTS.PROJECT_COMPLETED,
      DOMAIN_EVENTS.TASK_COMPLETED,
      DOMAIN_EVENTS.LEAD_CONVERTED,
      DOMAIN_EVENTS.LEAD_CREATED,
      DOMAIN_EVENTS.LEAD_MOVED,
      DOMAIN_EVENTS.NOTE_CREATED,
    ],
    featureFlags: [
      {
        key: "agency_os.intelligence",
        module: "agency-os",
        description: "Camada de inteligência (briefing, feed, insights)",
        defaultStatus: "on",
      },
      {
        key: "agency_os.pipeline",
        module: "agency-os",
        description: "Pipeline comercial premium",
        defaultStatus: "on",
      },
    ],
    widgets: [
      {
        id: "agency-os.health",
        module: "agency-os",
        title: "Health",
        lazy: true,
        permissions: ["agency:read"],
        component: HealthDiagnosisWidget,
      },
      {
        id: "agency-os.insights",
        module: "agency-os",
        title: "Insights",
        lazy: true,
        permissions: ["agency:read"],
        component: InsightsWidget,
      },
      {
        id: "agency-os.recommendations",
        module: "agency-os",
        title: "Recomendações",
        lazy: true,
        permissions: ["agency:read"],
        component: RecommendationsWidget,
      },
      {
        id: "agency-os.projects",
        module: "agency-os",
        title: "Projetos",
        lazy: true,
        permissions: ["agency:read"],
        component: ProjectsWidget,
      },
      {
        id: "agency-os.notes",
        module: "agency-os",
        title: "Notas",
        lazy: true,
        permissions: ["agency:read"],
        component: NotesWidget,
      },
      {
        id: "agency-os.performance",
        module: "agency-os",
        title: "Performance",
        lazy: true,
        permissions: ["agency:read", "reports:read"],
        component: PerformanceWidget,
      },
      {
        id: "agency-os.campaigns",
        module: "agency-os",
        title: "Campanhas",
        lazy: true,
        permissions: ["agency:read"],
        component: CampaignsWidget,
      },
      {
        id: "agency-os.finance",
        module: "agency-os",
        title: "Financeiro",
        lazy: true,
        permissions: ["agency:read", "finance:read"],
        component: FinanceWidget,
      },
      {
        id: "agency-os.timeline",
        module: "agency-os",
        title: "Timeline",
        lazy: true,
        colSpan: 2,
        permissions: ["agency:read"],
        component: TimelineWidget,
      },
    ],
    dashboards: [
      {
        id: "agency-os.client-workspace",
        module: "agency-os",
        title: "Workspace do cliente",
        widgetIds: [
          "agency-os.health",
          "agency-os.insights",
          "agency-os.recommendations",
          "agency-os.projects",
          "agency-os.notes",
          "agency-os.performance",
          "agency-os.campaigns",
          "agency-os.finance",
          "agency-os.timeline",
        ],
      },
    ],
  });

  configRegistry.register({
    id: "navigation",
    label: "Navegação",
    routes: NAVIGATION_ROUTES,
    searchProviders: [
      {
        id: "navigation-routes",
        module: "navigation",
        label: "Rotas",
        minQueryLength: 0,
        search: navigationSearch,
      },
    ],
  });
}

/** Busca server-side do Agency OS — chamada pelo core search. */
export async function agencyOsServerSearch(
  supabase: SupabaseClient,
  query: string,
): Promise<SearchResult[]> {
  const [clients, leads, projects, tasks] = await Promise.all([
    agencyClientRepository.list(supabase),
    agencyLeadRepository.listActive(supabase),
    agencyProjectRepository.listActive(supabase),
    agencyTaskRepository.listOpen(supabase),
  ]);
  return searchAgencyOs({ query, clients, leads, projects, tasks });
}

export { NAVIGATION_ROUTES };
