import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

/**
 * Se o usuário marca um customer filho da MCC, anexa também o manager
 * (login-customer-id na coleta). Função pura — segura no bundle do wizard.
 */
export function withGoogleAdsManagerParents(
  discovered: DiscoveredIdentityV1[],
  selectedIds: ReadonlySet<string>,
): DiscoveredIdentityV1[] {
  const picked = discovered.filter((item) => selectedIds.has(item.externalId));
  const parentIds = new Set(
    picked
      .map((item) => item.parentExternalId)
      .filter((id): id is string => Boolean(id) && !selectedIds.has(id)),
  );
  const extras = discovered.filter((item) => parentIds.has(item.externalId));
  return [...picked, ...extras];
}
