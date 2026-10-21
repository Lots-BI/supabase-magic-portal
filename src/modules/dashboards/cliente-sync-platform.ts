import { slugify } from "@/lib/slug";

export const CLIENTE_SYNC_PLATFORMS = [
  "meta_ads",
  "google_ads",
  "ga4",
  "instagram",
  "publicacoes",
  "tiktok",
  "youtube",
  "google_business",
] as const;

export type ClienteSyncPlatform = (typeof CLIENTE_SYNC_PLATFORMS)[number];

export const CLIENTE_SYNC_LABEL: Record<ClienteSyncPlatform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  ga4: "Google Analytics 4",
  instagram: "Instagram",
  publicacoes: "Publicações",
  tiktok: "TikTok",
  youtube: "YouTube",
  google_business: "Google Business",
};

/** Chave em `ph_connections.plugin_key`. */
export function hubPluginKeyForSync(platform: ClienteSyncPlatform): string {
  if (platform === "instagram" || platform === "publicacoes") return "instagram_organic";
  return platform;
}

export function isClienteSyncPlatform(value: string): value is ClienteSyncPlatform {
  return (CLIENTE_SYNC_PLATFORMS as readonly string[]).includes(value);
}

/** Índice nome/slug → cadastro_id para o Puxar da visão geral. */
export function indexCadastroIdsByClienteName(
  clientes: readonly { id: number | null; nome_cliente: string | null }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const cliente of clientes) {
    if (cliente.id == null || !cliente.nome_cliente) continue;
    const id = Number(cliente.id);
    const name = cliente.nome_cliente.trim();
    if (!name) continue;
    map.set(name, id);
    map.set(name.toLowerCase(), id);
    map.set(slugify(name), id);
  }
  return map;
}

export function lookupCadastroId(
  index: ReadonlyMap<string, number>,
  clienteName: string,
): number | null {
  const name = clienteName.trim();
  if (!name) return null;
  return index.get(name) ?? index.get(name.toLowerCase()) ?? index.get(slugify(name)) ?? null;
}
