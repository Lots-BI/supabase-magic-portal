import type { MediaAsset, MediaPreviewContext, ParsedCaption } from "./types";

const HASHTAG_RE = /#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g;

export function parseCaption(raw: string | null | undefined): ParsedCaption {
  if (!raw?.trim()) return { text: "", hashtags: [] };
  const hashtags = [...raw.matchAll(HASHTAG_RE)].map((m) => m[0]);
  return { text: raw.trim(), hashtags };
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatScheduledDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fakeLikeCount(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 120 + (h % 8800);
}

/** Fallback: capa_url vira asset único (sem exibir URL). */
export function capaUrlToAsset(capaUrl: string | null): MediaAsset[] {
  if (!capaUrl?.trim()) return [];
  const lower = capaUrl.toLowerCase();
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(lower);
  return [
    {
      id: "capa-fallback",
      kind: isVideo ? "video" : "image",
      url: capaUrl,
    },
  ];
}

/** Preview da publicação: peça final. Originais do cliente nunca entram aqui. */
export function assetsForPublishPreview(
  assets: MediaAsset[],
  mode: "final" | "draft" = "final",
): MediaAsset[] {
  if (mode === "final") {
    return assets.filter((asset) => asset.mediaRole === "final");
  }
  return assets.filter(
    (asset) => asset.mediaRole !== "cliente_material" && asset.mediaRole !== "final",
  );
}

const DISPLAY_ROLE_RANK: Record<string, number> = {
  final: 0,
  preview: 1,
  attachment: 2,
  cliente_material: 3,
};

/** Qualquer mídia visual anexada, para o cartaz / sheet do cliente. */
export function assetsForCardDisplay(
  assets: MediaAsset[],
  preferFinal = false,
): MediaAsset[] {
  const visual = assets.filter((asset) => asset.kind === "image" || asset.kind === "video");
  if (visual.length === 0) return [];
  const agency = visual.filter((asset) => asset.mediaRole !== "cliente_material");
  const source = agency.length > 0 ? agency : visual;
  return [...source].sort((a, b) => {
    const rank = (asset: MediaAsset) => {
      if (preferFinal && asset.mediaRole === "final") return -1;
      return DISPLAY_ROLE_RANK[asset.mediaRole ?? ""] ?? 8;
    };
    return rank(a) - rank(b) || (a.ordem ?? 0) - (b.ordem ?? 0);
  });
}

export function buildPreviewContext(
  post: {
    formato: string | null;
    plataforma: string;
    legenda: string | null;
    cliente_nome: string;
    data_publicacao: string;
    localizacao?: string | null;
  },
  assets: MediaAsset[],
  opts?: { showEngagement?: boolean; accountAvatarUrl?: string | null },
): MediaPreviewContext {
  return {
    formato: post.formato,
    plataforma: post.plataforma,
    assets,
    caption: post.legenda,
    accountName: post.cliente_nome,
    accountAvatarUrl: opts?.accountAvatarUrl ?? null,
    location: post.localizacao ?? null,
    scheduledAt: post.data_publicacao,
    showEngagement: opts?.showEngagement ?? true,
  };
}

export function hasMedia(ctx: MediaPreviewContext): boolean {
  return ctx.assets.length > 0;
}
