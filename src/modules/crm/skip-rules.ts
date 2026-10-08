import { normalizeUsername } from "./normalize-identity";
import type { CrmGraphComment } from "./types";

export function isHiddenComment(comment: CrmGraphComment): boolean {
  return comment.hidden === true;
}

export function isBrandComment(
  comment: CrmGraphComment,
  brandUsername: string | null | undefined,
): boolean {
  const brand = normalizeUsername(brandUsername);
  if (!brand) return false;
  const commentUser = normalizeUsername(comment.username ?? comment.from?.username);
  return commentUser === brand;
}

export type CrmBrandAuthor = {
  ids: ReadonlySet<string>;
  usernames: ReadonlySet<string>;
};

export function brandAuthor(
  ids: readonly (string | null | undefined)[],
  usernames: readonly (string | null | undefined)[],
): CrmBrandAuthor {
  return {
    ids: new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id))),
    usernames: new Set(
      usernames
        .map((name) => normalizeUsername(name))
        .filter((name): name is string => name !== null && !name.includes(" ")),
    ),
  };
}

/** Comentário ou resposta escrito pela própria conta do cliente. */
export function isBrandAuthor(
  author: { id?: string | null; username?: string | null },
  brand: CrmBrandAuthor,
): boolean {
  const id = author.id?.trim();
  if (id && brand.ids.has(id)) return true;
  const username = normalizeUsername(author.username);
  return Boolean(username && brand.usernames.has(username));
}

export function shouldSkipComment(
  comment: CrmGraphComment,
  brandUsername: string | null | undefined,
): boolean {
  if (!comment.id) return true;
  if (isHiddenComment(comment)) return true;
  if (isBrandComment(comment, brandUsername)) return true;
  const username = normalizeUsername(comment.username ?? comment.from?.username);
  const igsid = comment.from?.id?.trim();
  return !username && !igsid;
}
