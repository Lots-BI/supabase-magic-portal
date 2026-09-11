import { describe, expect, it } from "vitest";
import { cohortForMedia, isStillActive, rankMediaByReturn } from "./cohort";

const signals = [
  {
    personId: "ana",
    ignored: false,
    occurredAt: "2026-09-01T10:00:00.000Z",
    igMediaId: "post-a",
    pillarTitulo: "Prova social",
  },
  {
    personId: "ana",
    ignored: false,
    occurredAt: "2026-09-08T10:00:00.000Z",
    igMediaId: "post-b",
    pillarTitulo: "Oferta",
  },
  {
    personId: "bruno",
    ignored: false,
    occurredAt: "2026-09-01T11:00:00.000Z",
    igMediaId: "post-a",
  },
  {
    personId: "carla",
    ignored: true,
    occurredAt: "2026-09-01T12:00:00.000Z",
    igMediaId: "post-a",
  },
];

describe("rankMediaByReturn", () => {
  it("does not count ignored people or media comments_count", () => {
    const ranked = rankMediaByReturn(signals, 30);
    const postA = ranked.find((r) => r.igMediaId === "post-a");
    expect(postA?.firstTouchPeople).toBe(2);
    expect(postA?.returnedPeople).toBe(1);
    expect(postA?.returnRate).toBe(50);
    expect(postA?.pillarTitulo).toBe("Prova social");
  });

  it("counts cohort still-active inside the window", () => {
    expect(isStillActive("2026-09-01T10:00:00.000Z", ["2026-09-08T10:00:00.000Z"], 30)).toBe(true);
    expect(isStillActive("2026-09-01T10:00:00.000Z", ["2026-09-08T10:00:00.000Z"], 7)).toBe(true);
    expect(isStillActive("2026-09-01T10:00:00.000Z", ["2026-09-09T10:00:00.000Z"], 7)).toBe(false);
    const c = cohortForMedia(signals, "post-a", 30);
    expect(c.firstTouchPeople).toBe(2);
    expect(c.activeInWindow).toBe(1);
    expect(c.activeRate).toBe(50);
  });
});
