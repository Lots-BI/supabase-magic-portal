import { describe, expect, it } from "vitest";
import { averageStageDurationMs, computeStageDurations } from "./compute-stage-durations";
import type { ContentCardEvent } from "../types/content-card-event";

describe("computeStageDurations", () => {
  it("computes duration between created and approved", () => {
    const events: ContentCardEvent[] = [
      {
        id: "1",
        card_id: "c",
        actor_id: null,
        actor_email: null,
        event_type: "created",
        payload: {},
        created_at: "2026-07-01T10:00:00.000Z",
      },
      {
        id: "2",
        card_id: "c",
        actor_id: null,
        actor_email: null,
        event_type: "approved",
        payload: { status_para: "aguardando_material" },
        created_at: "2026-07-01T12:00:00.000Z",
      },
    ];
    const durations = computeStageDurations(events);
    expect(durations).toHaveLength(2);
    expect(durations[0].fromStatus).toBe("start");
    expect(durations[0].toStatus).toBe("roteiro");
    expect(durations[1].fromStatus).toBe("roteiro");
    expect(durations[1].toStatus).toBe("aguardando_material");
    expect(durations[1].durationMs).toBe(2 * 60 * 60 * 1000);
    expect(averageStageDurationMs(durations)).toBe(1 * 60 * 60 * 1000);
  });
});
