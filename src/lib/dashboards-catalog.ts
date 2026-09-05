import type { LucideIcon } from "lucide-react";
import { BarChart3, Facebook, Globe, Images, Instagram, Megaphone, Music2 } from "lucide-react";
import type { Platform } from "@/lib/metrics";

export type DashboardFamilyId = "paid" | "organic" | "analytics";

export const DASHBOARD_FAMILY_META: Record<
  DashboardFamilyId,
  { label: string; description: string; order: number }
> = {
  paid: {
    label: "Mídia paga",
    description: "Campanhas e investimento em anúncios.",
    order: 1,
  },
  organic: {
    label: "Orgânico",
    description: "Presença e conteúdo nas redes e no perfil local.",
    order: 2,
  },
  analytics: {
    label: "Analytics",
    description: "Tráfego e comportamento no site.",
    order: 3,
  },
};

export type DashboardRouteTo =
  | "/cliente/$cliente/instagram"
  | "/cliente/$cliente/meta-ads"
  | "/cliente/$cliente/google-ads"
  | "/cliente/$cliente/ga4"
  | "/cliente/$cliente/google-business"
  | "/cliente/$cliente/tiktok"
  | "/cliente/$cliente/publicacoes";

export type DashboardCatalogEntry = {
  id: string;
  requires: Platform;
  to: DashboardRouteTo;
  label: string;
  description: string;
  family: DashboardFamilyId;
  icon: LucideIcon;
};

export const DASHBOARD_CATALOG: DashboardCatalogEntry[] = [
  {
    id: "meta_ads",
    requires: "meta_ads",
    to: "/cliente/$cliente/meta-ads",
    label: "Meta Ads",
    description:
      "Investimento, alcance, frequência e eficiência das campanhas no Facebook e Instagram.",
    family: "paid",
    icon: Facebook,
  },
  {
    id: "google_ads",
    requires: "google_ads",
    to: "/cliente/$cliente/google-ads",
    label: "Google Ads",
    description: "Investimento, cliques e eficiência das campanhas na Rede de Pesquisa e Display.",
    family: "paid",
    icon: Megaphone,
  },
  {
    id: "tiktok",
    requires: "tiktok",
    to: "/cliente/$cliente/tiktok",
    label: "TikTok",
    description: "Métricas de campanhas e conteúdo da conta TikTok.",
    family: "paid",
    icon: Music2,
  },
  {
    id: "instagram",
    requires: "instagram",
    to: "/cliente/$cliente/instagram",
    label: "Instagram",
    description: "Alcance, engajamento e ações do perfil orgânico.",
    family: "organic",
    icon: Instagram,
  },
  {
    id: "publicacoes",
    requires: "instagram",
    to: "/cliente/$cliente/publicacoes",
    label: "Publicações",
    description: "Performance por post — feed, Reels, carrossel e stories.",
    family: "organic",
    icon: Images,
  },
  {
    id: "google_business",
    requires: "google_business",
    to: "/cliente/$cliente/google-business",
    label: "Google Business",
    description: "Visualizações, buscas, ações e reputação do perfil local.",
    family: "organic",
    icon: Globe,
  },
  {
    id: "ga4",
    requires: "ga4",
    to: "/cliente/$cliente/ga4",
    label: "Google Analytics 4",
    description: "Usuários, sessões, eventos e conversões do site.",
    family: "analytics",
    icon: BarChart3,
  },
];

const PLATFORM_ALIASES: Record<string, Platform> = {
  "meta-ads": "meta_ads",
  "google-ads": "google_ads",
  "google-business": "google_business",
};

export function normalizeDashboardPlatform(raw: string): Platform | null {
  const key = PLATFORM_ALIASES[raw] ?? raw.replace(/-/g, "_");
  if (
    key === "meta_ads" ||
    key === "google_ads" ||
    key === "ga4" ||
    key === "instagram" ||
    key === "google_business" ||
    key === "tiktok"
  ) {
    return key;
  }
  return null;
}

export function catalogForPlatforms(rawPlatforms: string[]): DashboardCatalogEntry[] {
  const active = new Set(
    rawPlatforms.map(normalizeDashboardPlatform).filter((key): key is Platform => key != null),
  );
  return DASHBOARD_CATALOG.filter((entry) => active.has(entry.requires));
}

export type DashboardNavTarget = {
  id: string;
  to: DashboardRouteTo;
  params: { cliente: string };
  label: string;
  icon: LucideIcon;
};

export function dashboardNavTargets(slug: string, platforms: string[]): DashboardNavTarget[] {
  return catalogForPlatforms(platforms).map((entry) => ({
    id: entry.id,
    to: entry.to,
    params: { cliente: slug },
    label: entry.label,
    icon: entry.icon,
  }));
}

export function resolveDashboardPath(to: string, params?: { cliente?: string }) {
  if (params?.cliente) return to.replace("$cliente", params.cliente);
  return to;
}
