// ============================================================================
// Lots BI · Detecção de plataformas com dados por cliente.
// Usa views reais (PlatformDef) — não depende de colunas incorretas no overview.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, brtToday } from "@/lib/period";
import { PLATFORM_REGISTRY } from "@/lib/platforms/registry";

export type ClientPlatformRouteKey =
  | "instagram"
  | "meta-ads"
  | "google-ads"
  | "ga4"
  | "google-business"
  | "tiktok";

const REGISTRY_TO_ROUTE: Record<string, ClientPlatformRouteKey> = {
  instagram: "instagram",
  meta_ads: "meta-ads",
  google_ads: "google-ads",
  ga4: "ga4",
  google_business: "google-business",
};

const PROBE_DAYS = 90;

/** Retorna chaves de rota (/cliente/.../meta-ads) com dados nos últimos 90 dias. */
export async function detectClientPlatforms(queryName: string): Promise<ClientPlatformRouteKey[]> {
  const since = addDaysISO(brtToday(), -PROBE_DAYS);
  const found: ClientPlatformRouteKey[] = [];

  await Promise.all(
    Object.entries(PLATFORM_REGISTRY).map(async ([registryKey, def]) => {
      const routeKey = REGISTRY_TO_ROUTE[registryKey];
      if (!routeKey) return;

      const { data, error } = await supabase
        .from(def.view)
        .select("data")
        .eq("cliente", queryName)
        .gte("data", since)
        .limit(1);

      if (error) {
        console.warn(`[detectClientPlatforms] ${def.view}:`, error.message);
        return;
      }
      if ((data?.length ?? 0) > 0) found.push(routeKey);
    }),
  );

  const order: ClientPlatformRouteKey[] = [
    "instagram",
    "meta-ads",
    "google-ads",
    "ga4",
    "google-business",
    "tiktok",
  ];
  return order.filter((k) => found.includes(k));
}
