// ============================================================================
// Lots BI · Media Preview — contrato declarativo.
// Novo formato = registrar MediaFormatDef + Renderer. Nenhum switch espalhado.
// ============================================================================

export type MediaKind = "image" | "video";

export type MediaFormatKey = "feed" | "carousel" | "story" | "reel" | "video";

/** Asset de mídia resolvido (URL pronta para render — nunca exibir como texto). */
export interface MediaAsset {
  id: string;
  kind: MediaKind;
  url: string;
  posterUrl?: string | null;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  ordem?: number;
}

/** Contexto completo para renderizar preview fiel à publicação. */
export interface MediaPreviewContext {
  /** feed | story | reel | carrossel | video — normalizado internamente */
  formato: string | null;
  plataforma: string;
  assets: MediaAsset[];
  caption: string | null;
  accountName: string;
  accountAvatarUrl?: string | null;
  location?: string | null;
  scheduledAt?: string | null;
  /** Curtidas fictícias no mock social (opcional) */
  showEngagement?: boolean;
}

export interface MediaFormatDef {
  key: MediaFormatKey;
  label: string;
  /** Maior = avaliado primeiro */
  priority: number;
  matches: (ctx: MediaPreviewContext) => boolean;
}

export interface ParsedCaption {
  text: string;
  hashtags: string[];
}
