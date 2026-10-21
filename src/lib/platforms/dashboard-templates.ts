/**
 * Recortes de leitura do dashboard. Não mudam a coleta: só escolhem
 * quais cards já existentes aparecem. A ordem dos `keys` é a prioridade.
 * Templates do usuário ficam no navegador, por plataforma — admin e cliente.
 */
export type DashboardTemplate = {
  id: string;
  label: string;
  description: string;
  keys: readonly string[];
  /** Quantos cards no máximo. Sem isto, entram todas as chaves que a plataforma tem. */
  limit?: number;
};

export type SavedDashboardTemplate = {
  id: string;
  label: string;
  cardIds: string[];
};

export const TEMPLATE_STORAGE = "lots.dashboard.template";
export const CUSTOM_TEMPLATES_STORAGE = "lots.dashboard.custom-templates";
export const PERSONALIZADO_ID = "custom:personalizado";
export const CUSTOM_TEMPLATE_PREFIX = "custom:";

export const DASHBOARD_TEMPLATES: readonly DashboardTemplate[] = [
  {
    id: "pulso",
    label: "Pulso",
    description: "O essencial do período, para ler em segundos.",
    limit: 4,
    keys: [
      "spend",
      "results",
      "cpa",
      "ctr",
      "messaging_conversations_started",
      "clicks",
      "reach",
      "interactions",
      "engagement_rate",
      "views",
      "active_users",
      "sessions",
      "conversions",
      "profile_views",
      "searches",
      "website_clicks",
      "phone_calls",
    ],
  },
  {
    id: "eficiencia",
    label: "Eficiência",
    description: "Custo e taxa: o que o investimento rendeu.",
    keys: [
      "spend",
      "results",
      "clicks",
      "ctr",
      "ctr_link",
      "cpc",
      "cpc_link",
      "cpm",
      "cpa",
      "cpa_conv",
      "roas",
      "frequency",
      "engagement_rate",
      "conv_per_session",
      "conv_per_user",
      "views_per_reach",
      "actions_per_view",
      "events_per_session",
    ],
  },
  {
    id: "entrega",
    label: "Entrega",
    description: "O quanto a peça foi vista.",
    keys: [
      "impressions",
      "reach",
      "frequency",
      "views",
      "accounts_engaged",
      "unique_clicks",
      "profile_views",
      "searches",
      "photo_views",
    ],
  },
  {
    id: "resultado",
    label: "Resultado",
    description: "O que a campanha foi otimizada para entregar.",
    keys: [
      "results",
      "conversions",
      "messaging_conversations_started",
      "messaging_first_replies",
      "landing_page_views",
      "inline_link_clicks",
      "cpa",
      "follows",
      "website_clicks",
      "phone_calls",
      "messages",
      "direction_requests",
    ],
  },
  {
    id: "engajamento",
    label: "Engajamento",
    description: "Como as pessoas reagiram ao conteúdo.",
    keys: [
      "interactions",
      "likes",
      "comments",
      "saves",
      "shares",
      "replies",
      "post_engagements",
      "page_engagements",
      "accounts_engaged",
      "engagement_rate",
      "profile_links_taps",
    ],
  },
  {
    id: "video",
    label: "Vídeo",
    description: "Até onde o vídeo foi assistido.",
    keys: ["video_views", "video_thruplay", "video_p25", "video_p50", "video_p75", "video_p100"],
  },
  {
    id: "perfil",
    label: "Perfil",
    description: "Estoque da conta e ações no perfil.",
    keys: [
      "followers_count",
      "following_count",
      "media_count",
      "follows",
      "unfollows",
      "profile_views",
      "reviews_count",
      "reviews_rating",
      "photo_views",
    ],
  },
  {
    id: "tudo",
    label: "Tudo",
    description: "Todas as métricas coletadas.",
    keys: [],
  },
];

export const DEFAULT_DASHBOARD_TEMPLATE = "pulso";

function cardKey(id: string): string {
  const split = id.indexOf(":");
  return split === -1 ? id : id.slice(split + 1);
}

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith(CUSTOM_TEMPLATE_PREFIX);
}

export function newCustomTemplateId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${CUSTOM_TEMPLATE_PREFIX}${uuid}`;
}

export function templateById(id: string): DashboardTemplate {
  return DASHBOARD_TEMPLATES.find((template) => template.id === id) ?? DASHBOARD_TEMPLATES[0]!;
}

export function resolveTemplate(
  id: string,
  custom: readonly SavedDashboardTemplate[],
): { id: string; label: string; description: string } {
  const saved = custom.find((template) => template.id === id);
  if (saved) {
    return {
      id: saved.id,
      label: saved.label,
      description: "Recorte que você montou neste navegador.",
    };
  }
  const catalog = templateById(id);
  return { id: catalog.id, label: catalog.label, description: catalog.description };
}

function builtInVisible(allIds: readonly string[], templateId: string): string[] {
  const template = templateById(templateId);
  if (template.keys.length === 0) return [...allIds];
  const byKey = new Map(allIds.map((id) => [cardKey(id), id]));
  const picked = template.keys
    .map((key) => byKey.get(key))
    .filter((id): id is string => id != null);
  const unique = [...new Set(picked)];
  return template.limit ? unique.slice(0, template.limit) : unique;
}

/** Cards do template que esta plataforma realmente tem, na prioridade do template. */
export function visibleCardIds(
  allIds: readonly string[],
  templateId: string,
  custom: readonly SavedDashboardTemplate[] = [],
): string[] {
  const saved = custom.find((template) => template.id === templateId);
  if (saved) {
    const known = new Set(allIds);
    const kept = saved.cardIds.filter((id) => known.has(id));
    return kept.length > 0 ? kept : builtInVisible(allIds, DEFAULT_DASHBOARD_TEMPLATE);
  }
  return builtInVisible(allIds, templateId);
}

/** Template entra na edição quando a plataforma tem pelo menos duas métricas dele. */
export function templateFits(
  allIds: readonly string[],
  templateId: string,
  custom: readonly SavedDashboardTemplate[] = [],
): boolean {
  if (templateId === "tudo" || templateId === "pulso") return true;
  if (isCustomTemplateId(templateId)) {
    return custom.some((template) => template.id === templateId);
  }
  return visibleCardIds(allIds, templateId).length >= 2;
}

export function readTemplateId(platformKey: string, custom: readonly SavedDashboardTemplate[] = []): string {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_TEMPLATE;
  try {
    const raw = window.localStorage.getItem(`${TEMPLATE_STORAGE}:${platformKey}`);
    if (!raw) return DEFAULT_DASHBOARD_TEMPLATE;
    if (DASHBOARD_TEMPLATES.some((template) => template.id === raw)) return raw;
    if (custom.some((template) => template.id === raw)) return raw;
  } catch {
    /* navegador sem storage */
  }
  return DEFAULT_DASHBOARD_TEMPLATE;
}

export function writeTemplateId(platformKey: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${TEMPLATE_STORAGE}:${platformKey}`, id);
  } catch {
    /* navegador sem storage */
  }
}

export function readCustomTemplates(platformKey: string): SavedDashboardTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${CUSTOM_TEMPLATES_STORAGE}:${platformKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.label !== "string") return [];
      if (!Array.isArray(row.cardIds)) return [];
      const cardIds = row.cardIds.filter((id): id is string => typeof id === "string");
      if (cardIds.length === 0) return [];
      return [{ id: row.id, label: row.label, cardIds }];
    });
  } catch {
    return [];
  }
}

export function writeCustomTemplates(platformKey: string, list: SavedDashboardTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CUSTOM_TEMPLATES_STORAGE}:${platformKey}`, JSON.stringify(list));
  } catch {
    /* navegador sem storage */
  }
}

export function upsertCustomTemplate(
  platformKey: string,
  template: SavedDashboardTemplate,
  current: readonly SavedDashboardTemplate[],
): SavedDashboardTemplate[] {
  const next = [...current.filter((item) => item.id !== template.id), template];
  writeCustomTemplates(platformKey, next);
  return next;
}

export function removeCustomTemplate(
  platformKey: string,
  id: string,
  current: readonly SavedDashboardTemplate[],
): SavedDashboardTemplate[] {
  const next = current.filter((item) => item.id !== id);
  writeCustomTemplates(platformKey, next);
  return next;
}
