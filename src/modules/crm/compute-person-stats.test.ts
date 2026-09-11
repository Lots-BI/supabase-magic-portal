import { describe, expect, it } from "vitest";
import { computePersonStats } from "./compute-person-stats";
import type { CrmSignalInput } from "./types";

function signal(partial: Partial<CrmSignalInput> & Pick<CrmSignalInput, "externalId" | "occurredAt">): CrmSignalInput {
  return {
    kind: "comment",
    place: "feed",
    source: "instagram_comment",
    body: "oi",
    ...partial,
  };
}

describe("computePersonStats", () => {
  it("counts signals across two media", () => {
    const stats = computePersonStats(
      [
        signal({ externalId: "a", occurredAt: "2026-08-01T12:00:00.000Z", igMediaId: "m1" }),
        signal({ externalId: "b", occurredAt: "2026-08-02T12:00:00.000Z", igMediaId: "m2" }),
        signal({
          externalId: "c",
          occurredAt: "2026-08-03T12:00:00.000Z",
          igMediaId: "m1",
          kind: "reply",
          source: "instagram_comment_reply",
        }),
      ],
      [],
      new Date("2026-08-04T12:00:00.000Z"),
    );
    expect(stats.signalCount).toBe(3);
    expect(stats.mediaDistinct).toBe(2);
    expect(stats.kindCounts.comment).toBe(2);
    expect(stats.kindCounts.reply).toBe(1);
  });

  it("marks dormindo when last signal was 50 days ago and there are 2+ signals", () => {
    const stats = computePersonStats(
      [
        signal({ externalId: "a", occurredAt: "2026-06-01T12:00:00.000Z" }),
        signal({ externalId: "b", occurredAt: "2026-06-10T12:00:00.000Z" }),
      ],
      [],
      new Date("2026-07-30T12:00:00.000Z"),
    );
    expect(stats.churnState).toBe("dormindo");
  });
});
