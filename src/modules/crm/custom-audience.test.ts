import { describe, expect, it } from "vitest";
import { consentedAudienceHashes } from "./custom-audience";

describe("consentedAudienceHashes", () => {
  it("refuses when there are no email/phone facts", () => {
    expect(consentedAudienceHashes([])).toEqual({
      emailHashes: [],
      phoneHashes: [],
      refusedReason: "no_consented_facts",
    });
  });

  it("does not hash IGSID or comment handles", () => {
    const result = consentedAudienceHashes([
      { field: "full_name", value: "Ana" },
      { field: "email", value: "ana@marca.com" },
    ]);
    expect(result.refusedReason).toBeNull();
    expect(result.emailHashes).toHaveLength(1);
    expect(result.emailHashes[0]).toHaveLength(64);
    expect(result.phoneHashes).toHaveLength(0);
  });
});
