/** Papéis que entram no painel e operam conexões e conteúdo. */
export const OPERATIONAL_MEMBER_ROLES = [
  "owner",
  "gestor",
  "social_media",
  "gestor_trafego",
] as const;

/** Papéis que criam cliente e usuário. */
export const MANAGER_MEMBER_ROLES = ["owner", "gestor"] as const;

export type OperationalMemberRole = (typeof OPERATIONAL_MEMBER_ROLES)[number];
export type ManagerMemberRole = (typeof MANAGER_MEMBER_ROLES)[number];

export function isOperationalMemberRole(role: string | null | undefined): boolean {
  return (OPERATIONAL_MEMBER_ROLES as readonly string[]).includes(role ?? "");
}

export function isManagerMemberRole(role: string | null | undefined): boolean {
  return (MANAGER_MEMBER_ROLES as readonly string[]).includes(role ?? "");
}

export function memberRolesGrantOperations(roles: readonly string[]): boolean {
  return roles.some((role) => isOperationalMemberRole(role));
}

/**
 * Org em que a escrita de cliente/usuário vai cair.
 * null = tabelas de organização ainda não existem; o fluxo antigo segue sem organization_id.
 */
export function pickWriteOrganization(input: {
  isPlatformOwner: boolean;
  manageableOrganizationIds: readonly string[];
  requestedOrganizationId?: string | null;
  lotsOrganizationId?: string | null;
}): string | null {
  const requested = input.requestedOrganizationId?.trim() || null;
  if (requested) {
    if (input.isPlatformOwner || input.manageableOrganizationIds.includes(requested)) {
      return requested;
    }
    throw new Error("Forbidden");
  }
  if (input.manageableOrganizationIds.length === 1) return input.manageableOrganizationIds[0];
  if (input.manageableOrganizationIds.length > 1) {
    throw new Error("Escolha a organização.");
  }
  if (input.isPlatformOwner) return input.lotsOrganizationId ?? null;
  return null;
}

export function findCrossOrgNameClash(
  rows: readonly { organization_id: string | null; nome_cliente: string | null }[],
  nome: string,
  organizationId: string,
): boolean {
  const needle = nome.trim().toLowerCase();
  return rows.some(
    (row) =>
      (row.nome_cliente ?? "").trim().toLowerCase() === needle &&
      row.organization_id !== organizationId,
  );
}
