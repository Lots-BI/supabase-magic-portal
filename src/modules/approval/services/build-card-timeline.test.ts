import { describe, expect, it } from "vitest";
import {
  buildCardTimeline,
  formatTimelineSentence,
  latestUnansweredChangeRequest,
} from "./build-card-timeline";
import type { ContentCardEvent } from "../types/content-card-event";

describe("buildCardTimeline", () => {
  it("sorts events chronologically", () => {
    const events: ContentCardEvent[] = [
      {
        id: "2",
        card_id: "c1",
        actor_id: null,
        actor_email: "b@test.com",
        event_type: "approved",
        payload: {},
        created_at: "2026-07-02T10:00:00Z",
      },
      {
        id: "1",
        card_id: "c1",
        actor_id: null,
        actor_email: "a@test.com",
        event_type: "created",
        payload: {},
        created_at: "2026-07-01T10:00:00Z",
      },
    ];
    const timeline = buildCardTimeline(events);
    expect(timeline[0].eventType).toBe("created");
    expect(timeline[1].eventType).toBe("approved");
    expect(formatTimelineSentence(timeline[0])).toContain("criou o Card");
  });

  it("extracts comment message from payload", () => {
    const timeline = buildCardTimeline([
      {
        id: "1",
        card_id: "c1",
        actor_id: null,
        actor_email: "u@test.com",
        event_type: "commented",
        payload: { mensagem: "Ajustar CTA" },
        created_at: "2026-07-01T10:00:00Z",
      },
    ]);
    expect(timeline[0].message).toBe("Ajustar CTA");
  });

  it("keeps the last unanswered change request", () => {
    const timeline = buildCardTimeline([
      {
        id: "1",
        card_id: "c1",
        actor_id: null,
        actor_email: "a@test.com",
        event_type: "approval_requested",
        payload: {},
        created_at: "2026-07-01T10:00:00Z",
      },
      {
        id: "2",
        card_id: "c1",
        actor_id: null,
        actor_email: "c@test.com",
        event_type: "changes_requested",
        payload: { mensagem: "Trocar gancho" },
        created_at: "2026-07-02T10:00:00Z",
      },
    ]);
    expect(latestUnansweredChangeRequest(timeline)?.message).toBe("Trocar gancho");
  });

  it("clears change request after the agency resends for approval", () => {
    const timeline = buildCardTimeline([
      {
        id: "1",
        card_id: "c1",
        actor_id: null,
        actor_email: "c@test.com",
        event_type: "changes_requested",
        payload: { mensagem: "Trocar gancho" },
        created_at: "2026-07-02T10:00:00Z",
      },
      {
        id: "2",
        card_id: "c1",
        actor_id: null,
        actor_email: "a@test.com",
        event_type: "approval_requested",
        payload: {},
        created_at: "2026-07-03T10:00:00Z",
      },
    ]);
    expect(latestUnansweredChangeRequest(timeline)).toBeNull();
  });
});
