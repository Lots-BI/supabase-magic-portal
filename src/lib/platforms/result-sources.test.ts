import { describe, expect, it } from "vitest";
import { attributeResultSource, summarizeResultSources } from "./result-sources";
import type { Row } from "./types";

function row(partial: Partial<Row> & { data: string }): Row {
  return { cliente: "Acme", ...partial };
}

describe("attributeResultSource", () => {
  it("aponta a conversa quando o resultado é a conversa", () => {
    expect(
      attributeResultSource(
        row({
          data: "2026-10-01",
          results: 4,
          messaging_conversations_started: 4,
          conversions: 1,
        }),
      ),
    ).toBe("messaging_conversations_started");
  });

  it("cai no objetivo quando nenhuma métrica gravada bate o total", () => {
    expect(attributeResultSource(row({ data: "2026-10-01", results: 9, conversions: 2 }))).toBe(
      "objective",
    );
  });
});

describe("summarizeResultSources", () => {
  it("soma o período atual e o anterior por métrica", () => {
    const slices = summarizeResultSources(
      [
        row({ data: "2026-10-10", results: 3, messaging_conversations_started: 3 }),
        row({ data: "2026-10-11", results: 2, inline_link_clicks: 2 }),
        row({ data: "2026-09-10", results: 1, messaging_conversations_started: 1 }),
      ],
      { from: "2026-10-01", to: "2026-10-31" },
      { from: "2026-09-01", to: "2026-09-30" },
    );

    expect(slices).toEqual([
      { key: "messaging_conversations_started", current: 3, previous: 1 },
      { key: "inline_link_clicks", current: 2, previous: 0 },
    ]);
  });
});
