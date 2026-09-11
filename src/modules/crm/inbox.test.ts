import { describe, expect, it } from "vitest";
import { isChurnQueue, isInboxNow } from "./inbox";

const now = new Date("2026-09-11T12:00:00.000Z");

describe("isInboxNow", () => {
  it("keeps a high-intent comment from the last 48h", () => {
    expect(
      isInboxNow(
        {
          ignoredAt: null,
          lastKind: "comment",
          lastSignalAt: "2026-09-11T10:00:00.000Z",
          intentScore: 80,
        },
        now,
      ),
    ).toBe(true);
  });

  it("drops ignored people even with reply_comment", () => {
    expect(
      isInboxNow({
        ignoredAt: "2026-09-11T09:00:00.000Z",
        lastKind: "comment",
        lastSignalAt: "2026-09-11T10:00:00.000Z",
        intentScore: 90,
        nextActionCode: "reply_comment",
      }),
    ).toBe(false);
  });

  it("drops stale low-intent comments", () => {
    expect(
      isInboxNow(
        {
          ignoredAt: null,
          lastKind: "comment",
          lastSignalAt: "2026-09-01T10:00:00.000Z",
          intentScore: 40,
        },
        now,
      ),
    ).toBe(false);
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
