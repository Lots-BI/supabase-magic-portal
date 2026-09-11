import { describe, expect, it } from "vitest";
import { isChurnQueue, isOpenInbox } from "./inbox";

describe("isOpenInbox", () => {
  it("keeps any inbound last signal, including WhatsApp and form", () => {
    expect(isOpenInbox({ ignoredAt: null, lastKind: "whatsapp" })).toBe(true);
    expect(isOpenInbox({ ignoredAt: null, lastKind: "form" })).toBe(true);
    expect(isOpenInbox({ ignoredAt: null, lastKind: "comment" })).toBe(true);
  });

  it("drops people the brand already answered", () => {
    expect(isOpenInbox({ ignoredAt: null, lastKind: "brand_reply" })).toBe(false);
  });

  it("drops ignored people", () => {
    expect(isOpenInbox({ ignoredAt: "2026-09-11T09:00:00.000Z", lastKind: "whatsapp" })).toBe(
      false,
    );
  });
});

describe("isChurnQueue", () => {
  it("includes em_risco and dormindo", () => {
    expect(isChurnQueue("em_risco", null)).toBe(true);
    expect(isChurnQueue("dormindo", null)).toBe(true);
    expect(isChurnQueue("recorrente", null)).toBe(false);
    expect(isChurnQueue("em_risco", "2026-09-11T00:00:00.000Z")).toBe(false);
  });
});
