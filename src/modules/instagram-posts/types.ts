export type IgMediaProductType = "FEED" | "REELS" | "STORY" | string;
export type IgMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string;

export interface IgMediaMetrics {
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  total_interactions?: number;
  replies?: number;
  exits?: number;
  taps_forward?: number;
  taps_back?: number;
  link_clicks?: number;
  ig_reels_avg_watch_time?: number;
  [key: string]: number | undefined;
}

/** Recorte editorial do card de Conteúdos ligado a uma publicação. */
export interface IgContentCardLink {
  id: string;
  titulo: string;
  formato: string | null;
  linhaEditorial: string | null;
  tema: string | null;
  cta: string | null;
  pilarTitulo: string | null;
  status: string;
  dataPublicacao: string;
  horaPublicacao: string | null;
  tags: string[] | null;
  excerpt: string | null;
}

/** Métricas da publicação usadas no drawer de Conteúdos. */
export interface PublishedIgSnapshot {
  mediaId: string;
  igMediaId: string;
  mediaProductType: string;
  permalink: string | null;
  lastSyncedAt: string | null;
  metrics: IgMediaMetrics;
  clienteSlug: string | null;
}

export interface IgMediaRow {
  id: string;
  cadastro_cliente_id: number;
  ig_media_id: string;
  media_product_type: IgMediaProductType;
  media_type: IgMediaType;
  caption: string | null;
  permalink: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  thumbnail_storage_path: string | null;
  published_at: string;
  metrics: IgMediaMetrics;
  metrics_collected_at: string | null;
  last_synced_at: string | null;
  content_card_id: string | null;
  cliente_nome?: string;
  cliente_slug?: string;
  contentCard?: IgContentCardLink;
}

export interface IgMediaSyncItemV1 {
  igMediaId: string;
  mediaProductType: string;
  mediaType: string;
  caption?: string;
  permalink?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  metrics: IgMediaMetrics;
  metricsCollectedAt: string;
}

export interface IgMediaSyncPayloadV1 {
  cadastroClienteId: number;
  items: IgMediaSyncItemV1[];
}

export const IG_MEDIA_SYNC_PAYLOAD_KEY = "igMediaSync" as const;

export function isIgMediaSyncPayload(
  payload: Record<string, unknown>,
): payload is IgMediaSyncPayloadV1 & Record<string, unknown> {
  return typeof payload.cadastroClienteId === "number" && Array.isArray(payload.items);
}
