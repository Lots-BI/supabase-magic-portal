import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, passwordStrength } from "./signup-rate-limit";

describe("passwordStrength", () => {
  it("recusa senha curta ou só letras", () => {
    expect(passwordStrength("Ab1")).toMatch(/10 caracteres/);
    expect(passwordStrength("abcdefghij")).toMatch(/letra e número/);
    expect(passwordStrength("LotsBI#2026")).toBeNull();
  });
});

describe("clientIpFromHeaders", () => {
  it("usa o primeiro IP do forwarded-for", () => {
    expect(clientIpFromHeaders({ forwardedFor: "1.1.1.1, 2.2.2.2", realIp: "3.3.3.3" })).toBe(
      "1.1.1.1",
    );
  });
});
