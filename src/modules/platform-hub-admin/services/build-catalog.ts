import { createHubRegistry } from "@/modules/platform-hub/public";
import type { PlatformCatalogItemV1 } from "../types";

export function isHubWizardConnectable(pluginKey: string): boolean {
  return (
    pluginKey !== "tiktok" &&
    pluginKey !== "youtube" &&
    pluginKey !== "google_business" &&
    pluginKey !== "google_ads" &&
    pluginKey !== "ga4"
  );
}

export function buildPlatformCatalog(
  connectionStats: Map<string, { count: number; avgHealth: number | null }>,
): PlatformCatalogItemV1[] {
  const registry = createHubRegistry();
  return registry
    .getAllPlugins()
    .filter((p) => p.manifest.kind === "platform")
    .filter((p) => isHubWizardConnectable(p.manifest.key))
    .map((registration) => {
      const m = registration.manifest;
      const stats = connectionStats.get(m.key) ?? { count: 0, avgHealth: null };
      return {
        key: m.key,
        label: m.label,
        category: m.category,
        capabilities: [...(m.capabilities as readonly string[])],
        providers: [...m.providers.supported],
        defaultProvider: m.providers.default,
        apiVersions: [...m.versions],
        oauthType: m.oauth?.type ?? null,
        identityTypes: [...(m.identity?.types ?? [])],
        connectionCount: stats.count,
        avgHealthScore: stats.avgHealth,
        manifest: m,
      };
    });
}
