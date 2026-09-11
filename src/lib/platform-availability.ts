// ============================================================================
// Lots BI · Detecção de plataformas com dados por cliente.
// Usa portfolio_clientes_ativos (RPC) — não sonda as views diárias.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { normalizeDashboardPlatform } from "@/lib/dashboards-catalog";

export type ClientPlatformRouteKey =
  | "instagram"
  | "meta-ads"
  | "google-ads"
  | "ga4"
  | "google-business"
  | "tiktok";

const CATALOG_TO_ROUTE: Record<string, ClientPlatformRouteKey> = {
  instagram: "instagram",
  meta_ads: "meta-ads",
  google_ads: "google-ads",
  ga4: "ga4",
  google_business: "google-business",
  tiktok: "tiktok",
};

const ORDER: ClientPlatformRouteKey[] = [
  "instagram",
  "meta-ads",
  "google-ads",
  "ga4",
  "google-business",
  "tiktok",
];

/** Retorna chaves de rota (/cliente/.../meta-ads) com métrica ou conexão. */
export async function detectClientPlatforms(queryName: string): Promise<ClientPlatformRouteKey[]> {
  const { data, error } = await supabase.rpc("portfolio_clientes_ativos");
  if (error) {
    console.warn("[detectClientPlatforms]", error.message);
    return [];
  }
  const row = (data ?? []).find((item) => item.cliente === queryName);
  const found = new Set<ClientPlatformRouteKey>();
  for (const raw of row?.plataformas_ativas ?? []) {
    const catalog = normalizeDashboardPlatform(raw);
    const route = catalog ? CATALOG_TO_ROUTE[catalog] : undefined;
    if (route) found.add(route);
  }
  return ORDER.filter((key) => found.has(key));
}
