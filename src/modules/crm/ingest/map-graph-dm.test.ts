import { describe, expect, it } from "vitest";
import { mapGraphDmToSignal } from "./map-graph-dm";

describe("mapGraphDmToSignal", () => {
  it("does not invent email from free text", () => {
    const mapped = mapGraphDmToSignal({
      id: "m1",
      text: "meu email é ana@x.com",
      timestamp: "2026-09-11T10:00:00.000Z",
      from: { id: "igsid-1", username: "ana" },
    });
    expect(mapped?.signal.kind).toBe("dm");
    expect(mapped?.identities.some((i) => i.kind === "email")).toBe(false);
  });

  it("skips messages without IGSID or username", () => {
    expect(mapGraphDmToSignal({ id: "m2", text: "oi" })).toBeNull();
  });
});
