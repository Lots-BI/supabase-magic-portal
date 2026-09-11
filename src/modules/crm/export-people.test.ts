import { describe, expect, it } from "vitest";
import { toCsv, toExportRow } from "./export-people";

describe("toExportRow", () => {
  it("leaves email and phone empty without field_facts even if the comment mentions them", () => {
    const row = toExportRow({
      personId: "p1",
      displayName: "Ana",
      firstSeen: "2026-09-01T00:00:00.000Z",
      lastSeen: "2026-09-11T00:00:00.000Z",
      intentScore: 40,
      churnState: "novo",
      identities: [{ kind: "ig_username", value: "@Ana" }],
      facts: [],
    });
    expect(row.ig_username).toBe("ana");
    expect(row.email).toBe("");
    expect(row.phone).toBe("");
  });

  it("fills email only from a consented field fact", () => {
    const row = toExportRow({
      personId: "p1",
      displayName: "Ana",
      firstSeen: null,
      lastSeen: null,
      intentScore: 10,
      churnState: "novo",
      identities: [],
      facts: [{ field: "email", value: "ana@marca.com" }],
    });
    expect(row.email).toBe("ana@marca.com");
  });
});

describe("toCsv", () => {
  it("never invents PII columns from comment text", () => {
    const csv = toCsv([
      toExportRow({
        personId: "p1",
        displayName: "me liga 11999999999",
        firstSeen: "",
        lastSeen: "",
        intentScore: 80,
        churnState: "novo",
        identities: [],
        facts: [],
      }),
    ]);
    expect(csv).toContain("email,phone");
    expect(csv.split("\n")[1]?.endsWith(",,")).toBe(true);
  });
});
