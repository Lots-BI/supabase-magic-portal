import { describe, expect, it } from "vitest";
import {
  ALL_META_AD_ACCOUNTS,
  primaryMetaAdAccountId,
  rowMatchesAdAccount,
} from "../meta-ad-account";

describe("rowMatchesAdAccount", () => {
  it("aceita qualquer linha no recorte Todas", () => {
    expect(rowMatchesAdAccount("act_2", ALL_META_AD_ACCOUNTS, "act_1")).toBe(true);
    expect(rowMatchesAdAccount(null, ALL_META_AD_ACCOUNTS, "act_1")).toBe(true);
  });

  it("isola a conta escolhida e trata nulo como primary", () => {
    expect(rowMatchesAdAccount("act_1", "act_1", "act_1")).toBe(true);
    expect(rowMatchesAdAccount(null, "act_1", "act_1")).toBe(true);
    expect(rowMatchesAdAccount("", "act_1", "act_1")).toBe(true);
    expect(rowMatchesAdAccount("act_2", "act_1", "act_1")).toBe(false);
    expect(rowMatchesAdAccount(null, "act_2", "act_1")).toBe(false);
  });
});

describe("primaryMetaAdAccountId", () => {
  it("preferência is_primary, senão a primeira", () => {
    expect(
      primaryMetaAdAccountId([
        { ad_account_id: "act_a", label: "A", is_primary: false },
        { ad_account_id: "act_b", label: "B", is_primary: true },
      ]),
    ).toBe("act_b");
    expect(
      primaryMetaAdAccountId([{ ad_account_id: "act_a", label: "A", is_primary: false }]),
    ).toBe("act_a");
  });
});
