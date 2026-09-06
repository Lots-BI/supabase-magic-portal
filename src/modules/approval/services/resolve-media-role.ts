import type { ApprovalRole } from "../types/approval-role";
import type { MediaRole } from "../types/content-card-attachment";

export type UploadMediaRole = MediaRole;

/** Cliente só envia original. Peça final é exclusividade da agência. */
export function resolveUploadMediaRole(
  actorRole: ApprovalRole,
  requested?: UploadMediaRole | null,
): UploadMediaRole {
  if (actorRole === "cliente") return "cliente_material";
  if (requested === "final" || requested === "cliente_material" || requested === "preview") {
    return requested;
  }
  return requested ?? "attachment";
}

/** Não promove material do cliente nem peça final a preview. */
export function persistMediaRole(role: UploadMediaRole, ordem: number): UploadMediaRole {
  if (role === "cliente_material" || role === "final") return role;
  if (role === "attachment" && ordem === 0) return "preview";
  return role;
}
