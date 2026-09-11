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
