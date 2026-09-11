import { normalizeDashboardPlatform } from "@/lib/dashboards-catalog";

/** plugin_key do Hub → plataformas do catálogo de dashboards. */
export const HUB_PLUGIN_DASHBOARD_PLATFORMS: Record<string, string[]> = {
  instagram_organic: ["instagram"],
  meta_ads: ["meta_ads"],
  google_ads: ["google_ads"],
  ga4: ["ga4"],
  google_business: ["google_business"],
  tiktok: ["tiktok"],
};

/**
 * Une plataformas com métricas (Make / views) com conexões ativas do Hub.
 * Uma conexão Meta Ads deve aparecer no hub mesmo sem linha em vw_clientes_ativos.
 */
export function mergeDashboardPlatforms(
  fromMetrics: readonly string[] | null | undefined,
  hubPluginKeys: readonly string[] | null | undefined,
): string[] {
  const active = new Set<string>();
  for (const raw of fromMetrics ?? []) {
    const key = normalizeDashboardPlatform(raw);
    if (key) active.add(key);
  }
  for (const plugin of hubPluginKeys ?? []) {
    for (const platform of HUB_PLUGIN_DASHBOARD_PLATFORMS[plugin] ?? []) {
      active.add(platform);
    }
  }
  return [...active];
}
