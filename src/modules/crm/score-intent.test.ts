import { describe, expect, it } from "vitest";
import { scoreIntent } from "./score-intent";

describe("scoreIntent", () => {
  it("scores purchase questions high", () => {
    const score = scoreIntent(
      [
        {
          kind: "comment",
          place: "reels",
          source: "instagram_comment",
          externalId: "1",
          body: "quanto custa?",
          occurredAt: "2026-09-11T10:00:00.000Z",
        },
      ],
      new Date("2026-09-11T12:00:00.000Z"),
    );
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("scores a generic compliment low", () => {
    const score = scoreIntent(
      [
        {
          kind: "comment",
          place: "feed",
          source: "instagram_comment",
          externalId: "1",
          body: "legal",
          occurredAt: "2026-08-01T10:00:00.000Z",
        },
      ],
      new Date("2026-09-11T12:00:00.000Z"),
    );
    expect(score).toBeLessThan(50);
  });
});
