import { normalizeUsername } from "../normalize-identity";
import type { CrmGraphComment, CrmSignalInput, CrmSignalKind, CrmSignalPlace } from "../types";
import { CRM_SOURCE_COMMENT, CRM_SOURCE_REPLY } from "../types";

export function placeFromMediaProductType(productType: string | null | undefined): CrmSignalPlace {
  const value = (productType ?? "").toUpperCase();
  if (value === "REELS") return "reels";
  if (value === "STORY") return "story";
  if (value === "FEED" || value === "AD") return "feed";
  return "unknown";
}

export function mapGraphCommentToSignal(
  comment: CrmGraphComment,
  media: {
    igMediaId: string;
    mediaProductType?: string | null;
    permalink?: string | null;
    contentCardId?: string | null;
    pilarTitulo?: string | null;
    tema?: string | null;
    captionExcerpt?: string | null;
  },
): CrmSignalInput {
  const isReply = Boolean(comment.parent_id);
  const kind: CrmSignalKind = isReply ? "reply" : "comment";
  const username = normalizeUsername(comment.username ?? comment.from?.username);
  return {
    kind,
    place: placeFromMediaProductType(media.mediaProductType),
    source: isReply ? CRM_SOURCE_REPLY : CRM_SOURCE_COMMENT,
    externalId: comment.id,
    body: comment.text ?? null,
    occurredAt: comment.timestamp || new Date().toISOString(),
    igMediaId: media.igMediaId,
    contentCardId: media.contentCardId ?? null,
    payload: {
      igMediaId: media.igMediaId,
      permalink: media.permalink ?? null,
      mediaProductType: media.mediaProductType ?? null,
      contentCardId: media.contentCardId ?? null,
      pilarTitulo: media.pilarTitulo ?? null,
      tema: media.tema ?? null,
      captionExcerpt: media.captionExcerpt ?? null,
      username,
      igsid: comment.from?.id ?? null,
      hidden: comment.hidden === true,
    },
  };
}
