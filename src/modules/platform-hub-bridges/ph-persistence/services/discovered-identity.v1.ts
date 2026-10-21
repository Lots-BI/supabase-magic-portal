/** Identidade descoberta via API oficial — bridge admin, fora do Provider Framework. */
export interface DiscoveredIdentityV1 {
  identityType: string;
  externalId: string;
  label: string;
  parentLabel?: string;
  /** MCC pai — ao vincular o customer, o wizard também anexa o manager. */
  parentExternalId?: string;
}
