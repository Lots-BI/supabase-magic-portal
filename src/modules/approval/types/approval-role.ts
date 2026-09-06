/** Papéis do workflow de conteúdo (app_role + social_media na migration 19). */
export const APPROVAL_ROLES = ["admin", "social_media", "cliente"] as const;
export type ApprovalRole = (typeof APPROVAL_ROLES)[number];

export type CardAction =
  | "view"
  | "create"
  | "edit"
  | "move"
  | "comment"
  | "approve"
  | "request_changes"
  | "reject"
  | "archive"
  | "delete"
  | "manage_pillars"
  | "manage_stories"
  | "edit_roteiro"
  | "upload_material"
  | "upload_final"
  | "schedule_publish";
