import { describe, expect, it } from "vitest";
import { eventTypeForTransition } from "./event-type-for-transition";

describe("eventTypeForTransition", () => {
  it("maps approval flow events", () => {
    expect(eventTypeForTransition("roteiro", "aguardando_aprovacao")).toBe("approval_requested");
    expect(eventTypeForTransition("producao", "aguardando_aprovacao_final")).toBe(
      "approval_requested",
    );
    expect(eventTypeForTransition("aguardando_aprovacao", "aguardando_material")).toBe("approved");
    expect(eventTypeForTransition("aguardando_aprovacao_final", "agendado")).toBe("approved");
    expect(eventTypeForTransition("aguardando_aprovacao", "alteracoes_roteiro")).toBe(
      "changes_requested",
    );
    expect(eventTypeForTransition("aguardando_aprovacao", "roteiro")).toBe("changes_requested");
    expect(eventTypeForTransition("aguardando_aprovacao_final", "alteracoes_design")).toBe(
      "changes_requested",
    );
    expect(eventTypeForTransition("aguardando_aprovacao_final", "producao")).toBe(
      "changes_requested",
    );
    expect(eventTypeForTransition("agendado", "publicado")).toBe("published");
    expect(eventTypeForTransition("publicado", "arquivado")).toBe("archived");
    expect(eventTypeForTransition("aguardando_material", "producao")).toBe("moved");
  });
});
