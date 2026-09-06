import { describe, expect, it } from "vitest";
import { aggregateStageAverages, formatDurationMs } from "./build-ops-dashboard";
import type { ContentCardEvent } from "../../types/content-card-event";

function event(
  partial: Partial<ContentCardEvent> & { id: string; event_type: ContentCardEvent["event_type"] },
): ContentCardEvent {
  return {
    card_id: "c1",
    actor_id: null,
    actor_email: null,
    payload: {},
    created_at: "2026-07-01T10:00:00.000Z",
    ...partial,
  };
}

describe("build-ops-dashboard", () => {
  it("aggregateStageAverages computes averages across cards", () => {
    const map = new Map<string, ContentCardEvent[]>([
      [
        "a",
        [
          event({ id: "1", event_type: "created", created_at: "2026-07-01T10:00:00.000Z" }),
          event({
            id: "2",
            event_type: "approved",
            created_at: "2026-07-01T12:00:00.000Z",
            payload: { status_para: "aguardando_material" },
          }),
        ],
      ],
    ]);
    const avgs = aggregateStageAverages(map);
    const stage = avgs.find((a) => a.stageKey === "roteiro->aguardando_material");
    expect(stage?.averageMs).toBe(2 * 60 * 60 * 1000);
    expect(stage?.sampleSize).toBe(1);
  });

  it("formatDurationMs renders hours", () => {
    expect(formatDurationMs(3.5 * 60 * 60 * 1000)).toBe("3.5h");
  });
});
