import { describe, expect, it } from "vitest";
import { nextAction } from "./next-action";
import type { CrmPersonStats } from "./types";

const baseStats: CrmPersonStats = {
  signalCount: 1,
  kindCounts: { comment: 1 },
  placeCounts: { feed: 1 },
  mediaDistinct: 1,
  cardDistinct: 0,
  pillarAffinity: {},
  recencyDays: 0,
  tenureDays: 0,
  activeWeeks: 1,
  streakWeeks: 1,
  churnState: "novo",
  intentScore: 80,
  piiCompleteness: 0,
  heatScore: 10,
  firstSignalAt: "2026-09-11T10:00:00.000Z",
  lastSignalAt: "2026-09-11T10:00:00.000Z",
};

describe("nextAction", () => {
  it("asks to reply a high-intent comment", () => {
    expect(nextAction({ stats: baseStats, lastKind: "comment" }).code).toBe("reply_comment");
  });

  it("asks for Relogin when comments scope is missing", () => {
    expect(nextAction({ stats: baseStats, commentsCollector: "scope_missing" }).code).toBe(
      "relogin",
    );
  });

  it("asks to reply a Direct", () => {
    expect(nextAction({ stats: baseStats, lastKind: "dm" }).code).toBe("reply_dm");
  });

  it("asks to reply WhatsApp even without high intent lexicon", () => {
    expect(
      nextAction({ stats: { ...baseStats, intentScore: 25 }, lastKind: "whatsapp" }).code,
    ).toBe("open_whatsapp");
  });

  it("asks to reply a form ingest", () => {
    expect(nextAction({ stats: baseStats, lastKind: "form" }).code).toBe("reply_inbox");
  });
});
