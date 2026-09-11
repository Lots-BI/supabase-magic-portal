import { describe, expect, it } from "vitest";
import { resolvePersonStitch } from "./stitch";

describe("resolvePersonStitch", () => {
  it("matches two comments with the same username to one person", () => {
    const first = resolvePersonStitch({ people: [], username: "@Ana" });
    expect(first.action).toBe("create");
    if (first.action !== "create") return;
    const people = [{ id: "p1", identities: first.identities }];
    const second = resolvePersonStitch({ people, username: "ana" });
    expect(second).toEqual({ action: "match", personId: "p1" });
  });

  it("attaches a later IGSID to the same username person", () => {
    const people = [
      {
        id: "p1",
        identities: [{ kind: "ig_username" as const, value: "ana", source: "instagram_comment" }],
      },
    ];
    const byUser = resolvePersonStitch({ people, username: "ana", igsid: "123" });
    expect(byUser).toEqual({ action: "match", personId: "p1" });
  });

  it("creates a different person for another username", () => {
    const people = [
      {
        id: "p1",
        identities: [{ kind: "ig_username" as const, value: "ana", source: "instagram_comment" }],
      },
    ];
    const other = resolvePersonStitch({ people, username: "bruno" });
    expect(other.action).toBe("create");
  });

  it("matches messenger_psid from ingest identities", () => {
    const people = [
      {
        id: "p1",
        identities: [{ kind: "messenger_psid" as const, value: "psid-9", source: "ingest_api:messenger" }],
      },
    ];
    const match = resolvePersonStitch({
      people,
      incoming: [{ kind: "messenger_psid", value: "psid-9", source: "ingest_api:messenger" }],
    });
    expect(match).toEqual({ action: "match", personId: "p1" });
  });

  it("matches a later lead-form email to the same person", () => {
    const people = [
      {
        id: "p1",
        identities: [{ kind: "email" as const, value: "ana@marca.com", source: "lead_ads" }],
      },
    ];
    const match = resolvePersonStitch({ people, email: "Ana@Marca.com" });
    expect(match).toEqual({ action: "match", personId: "p1" });
  });
});
