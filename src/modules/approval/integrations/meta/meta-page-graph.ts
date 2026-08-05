/** Helpers Graph API para publish em Facebook Page (Marco 4 MVP). */

export const META_PUBLISH_GRAPH_VERSION = "v22.0";

export type MetaPageTokenRow = {
  id: string;
  name?: string;
  access_token?: string;
};

export type MetaPhotoPublishResult = {
  photoId: string;
  postId?: string;
};

type GraphErrorBody = {
  error?: { message?: string; code?: number; type?: string };
};

export function metaGraphUrl(path: string, version = META_PUBLISH_GRAPH_VERSION): string {
  const clean = path.replace(/^\//, "");
  return `https://graph.facebook.com/${version}/${clean}`;
}

export function pickPageAccessToken(
  pages: readonly MetaPageTokenRow[],
  pageId: string,
): string | null {
  const match = pages.find((p) => p.id === pageId);
  const token = match?.access_token?.trim();
  return token || null;
}

export async function fetchManagedPagesWithTokens(
  userAccessToken: string,
): Promise<MetaPageTokenRow[]> {
  const url = new URL(metaGraphUrl("me/accounts"));
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", userAccessToken);

  const response = await fetch(url);
  const body = (await response.json()) as {
    data?: MetaPageTokenRow[];
  } & GraphErrorBody;

  if (!response.ok || body.error?.message) {
    throw new Error(body.error?.message ?? `Meta me/accounts HTTP ${response.status}`);
  }
  return body.data ?? [];
}

/**
 * Publica foto na Page via multipart (`source`).
 * Preferível a `url=` — funciona mesmo com signed URLs privadas no browser do servidor.
 */
export async function publishPagePhotoMultipart(input: {
  pageId: string;
  pageAccessToken: string;
  imageBytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
  caption: string;
}): Promise<MetaPhotoPublishResult> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(input.imageBytes)], {
    type: input.mimeType || "image/jpeg",
  });
  form.append("source", blob, input.fileName ?? "photo.jpg");
  form.append("caption", input.caption);
  form.append("published", "true");
  form.append("access_token", input.pageAccessToken);

  const response = await fetch(metaGraphUrl(`${input.pageId}/photos`), {
    method: "POST",
    body: form,
  });
  const body = (await response.json()) as {
    id?: string;
    post_id?: string;
  } & GraphErrorBody;

  if (!response.ok || body.error?.message || !body.id) {
    throw new Error(body.error?.message ?? `Meta photos HTTP ${response.status}`);
  }

  return { photoId: body.id, postId: body.post_id };
}

export function facebookPostPermalink(pageId: string, postId?: string): string | undefined {
  if (!postId) return undefined;
  // post_id costuma ser "{pageId}_{storyId}"
  const storyId = postId.includes("_") ? postId.split("_").slice(1).join("_") : postId;
  return `https://www.facebook.com/${pageId}/posts/${storyId}`;
}
