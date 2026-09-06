import type { AttachmentKind } from "../types/content-card-attachment";

export type PublishMediaItem = {
  url: string;
  kind: AttachmentKind;
  mime_type: string;
};

export type InstagramPublishPlan =
  | { type: "image"; image_url: string; caption: string }
  | { type: "reels"; video_url: string; caption: string }
  | {
      type: "carousel";
      items: Array<{ image_url?: string; video_url?: string }>;
      caption: string;
    };

const CAPTION_MAX = 2200;

export function captionForCard(legenda: string | null, copyText: string | null): string {
  const raw = (legenda || copyText || "").trim();
  return raw.slice(0, CAPTION_MAX);
}

function isVideo(item: PublishMediaItem): boolean {
  return item.kind === "video" || item.mime_type.startsWith("video/");
}

function isImage(item: PublishMediaItem): boolean {
  return item.kind === "image" || item.mime_type.startsWith("image/");
}

/** Mapeia formato editorial + arquivos finais para o contrato do Content Publishing API. */
export function buildInstagramPublishPlan(
  formato: string | null,
  caption: string,
  media: PublishMediaItem[],
): InstagramPublishPlan {
  const usable = media.filter((item) => isImage(item) || isVideo(item));
  if (usable.length === 0) {
    throw new Error("Anexe a mídia final (imagem ou vídeo) antes de publicar.");
  }

  const trimmedCaption = caption.slice(0, CAPTION_MAX);

  if (usable.length >= 2 && (formato === "carrossel" || usable.every((item) => isImage(item)))) {
    return {
      type: "carousel",
      caption: trimmedCaption,
      items: usable.slice(0, 10).map((item) =>
        isVideo(item) ? { video_url: item.url } : { image_url: item.url },
      ),
    };
  }

  const first = usable[0];
  if (isVideo(first) || formato === "reels") {
    if (!isVideo(first)) {
      return { type: "image", image_url: first.url, caption: trimmedCaption };
    }
    return { type: "reels", video_url: first.url, caption: trimmedCaption };
  }

  return { type: "image", image_url: first.url, caption: trimmedCaption };
}
