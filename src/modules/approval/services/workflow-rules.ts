import type { ContentCardStatus } from "../types/content-card";

export const LIBRARY_STATUSES: ContentCardStatus[] = ["publicado", "arquivado"];

export function isLibraryStatus(status: ContentCardStatus): boolean {
  return LIBRARY_STATUSES.includes(status);
}

export function isHardDeleteForbidden(status: ContentCardStatus): boolean {
  return status === "publicado" || status === "arquivado";
}

/** Ao arquivar, cancela fila de publicação — senão o job ainda posta o card. */
export function publishPatchOnArchive(publishStatus: string): {
  publish_status?: "none";
  scheduled_publish_at?: null;
  publish_error?: null;
} {
  if (publishStatus === "published") return {};
  return {
    publish_status: "none",
    scheduled_publish_at: null,
    publish_error: null,
  };
}
