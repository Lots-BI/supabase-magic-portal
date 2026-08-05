import type { ContentCard } from "../../types/content-card";
import type { PublishResult, PublishTarget } from "../ports";

export function isMetaLivePublishPlatform(plataforma: string): boolean {
  const p = plataforma.trim().toLowerCase();
  return p === "facebook" || p === "meta";
}

export function resolvePublishCaption(card: ContentCard): string {
  const fromLegenda = card.legenda?.trim();
  if (fromLegenda) return fromLegenda;
  const fromCopy = card.copy_text?.trim();
  if (fromCopy) return fromCopy;
  return card.titulo.trim();
}

export function assertFacebookPublishTarget(target: PublishTarget): void {
  if (target !== "facebook") {
    throw new Error(
      target === "instagram"
        ? "Publicação Instagram ainda não está no MVP (Marco 4). Use plataforma Facebook ou marque Publicado localmente."
        : `Target ${target} não suportado no publisher Meta MVP.`,
    );
  }
}

export function mergeMetaPublishMetadata(
  existing: Record<string, unknown>,
  result: PublishResult & { pageId: string; photoId: string; connectionId: string },
): Record<string, unknown> {
  return {
    ...existing,
    meta_publish: {
      target: "facebook",
      mode: "live",
      pageId: result.pageId,
      photoId: result.photoId,
      externalId: result.externalId,
      url: result.url ?? null,
      publishedAt: result.publishedAt,
      connectionId: result.connectionId,
    },
  };
}

export function readMetaPublishFromMetadata(
  metadata: Record<string, unknown>,
): PublishResult | null {
  const raw = metadata.meta_publish;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.externalId !== "string" || typeof row.publishedAt !== "string") return null;
  return {
    externalId: row.externalId,
    publishedAt: row.publishedAt,
    url: typeof row.url === "string" ? row.url : undefined,
  };
}
