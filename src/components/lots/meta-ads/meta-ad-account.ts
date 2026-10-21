export const ALL_META_AD_ACCOUNTS = "";

export type MetaAdAccountOption = {
  ad_account_id: string;
  label: string;
  is_primary: boolean;
};

export function primaryMetaAdAccountId(
  accounts: readonly MetaAdAccountOption[],
): string | undefined {
  return accounts.find((item) => item.is_primary)?.ad_account_id ?? accounts[0]?.ad_account_id;
}

/** Linhas Hub antigas (ad_account_id nulo) entram na conta primary. */
export function rowMatchesAdAccount(
  rowAccountId: string | null | undefined,
  selected: string,
  primaryId?: string | null,
): boolean {
  if (!selected) return true;
  const row = (rowAccountId ?? "").trim();
  if (row === selected) return true;
  return !row && primaryId === selected;
}
