import { describe, expect, it } from "vitest";
import { mapWhatsappInbound } from "./map-whatsapp";

describe("mapWhatsappInbound", () => {
  it("uses wa_id as phone fact and does not regex email from text", () => {
    const mapped = mapWhatsappInbound({
      messageId: "wamid.1",
      waId: "5511988887777",
      text: "email ana@x.com",
      timestamp: "2026-09-11T10:00:00.000Z",
    });
    expect(mapped?.facts).toEqual([
      expect.objectContaining({ field: "phone", value: "5511988887777" }),
    ]);
    expect(mapped?.identities.some((i) => i.kind === "email")).toBe(false);
  });
});
