import { describe, expect, it } from "vitest";
import { buildCommentThreads, type CrmThreadSource } from "./comment-threads";

function row(
  patch: Partial<CrmThreadSource> & Pick<CrmThreadSource, "id" | "kind" | "externalId">,
): CrmThreadSource {
  return {
    personId: "p1",
    personName: "@ana",
    body: "oi",
    occurredAt: "2026-10-01T10:00:00.000Z",
    place: "reels",
    permalink: null,
    captionExcerpt: null,
    parentId: null,
    inReplyTo: null,
    hidden: false,
    ...patch,
  };
}

describe("buildCommentThreads", () => {
  it("coloca respostas da audiência e da marca no comentário de topo", () => {
    const threads = buildCommentThreads([
      row({
        id: "root",
        kind: "comment",
        externalId: "c1",
        body: "quanto custa?",
        occurredAt: "2026-10-01T10:00:00.000Z",
      }),
      row({
        id: "child",
        kind: "reply",
        externalId: "c2",
        parentId: "c1",
        body: "e o prazo?",
        occurredAt: "2026-10-01T11:00:00.000Z",
        personName: "@bia",
      }),
      row({
        id: "brand",
        kind: "brand_reply",
        externalId: "b1",
        inReplyTo: "c2",
        body: "te respondo no direct",
        occurredAt: "2026-10-01T12:00:00.000Z",
      }),
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0]?.answered).toBe(true);
    expect(threads[0]?.replies.map((reply) => reply.body)).toEqual([
      "e o prazo?",
      "te respondo no direct",
    ]);
    expect(threads[0]?.replies[1]?.fromBrand).toBe(true);
    expect(threads[0]?.replies[1]?.personName).toBe("Marca");
  });

  it("nunca cria card para comentário da própria marca", () => {
    const threads = buildCommentThreads(
      [
        row({ id: "root", kind: "comment", externalId: "c1" }),
        row({ id: "brand-top", kind: "brand_reply", externalId: "b0" }),
        row({ id: "brand-reply", kind: "brand_reply", externalId: "b1", parentId: "c1" }),
      ],
      { brandName: "@rodrigoadvs" },
    );
    expect(threads.map((thread) => thread.id)).toEqual(["root"]);
    expect(threads[0]?.replies[0]?.personName).toBe("@rodrigoadvs");
  });

  it("mantém só a versão da marca quando o mesmo comentário veio duplicado", () => {
    const threads = buildCommentThreads([
      row({ id: "root", kind: "comment", externalId: "c1" }),
      row({ id: "old", kind: "reply", externalId: "b1", parentId: "c1", personName: "@marca" }),
      row({ id: "new", kind: "brand_reply", externalId: "b1", parentId: "c1" }),
    ]);
    expect(threads[0]?.replies).toHaveLength(1);
    expect(threads[0]?.replies[0]?.fromBrand).toBe(true);
  });

  it("mostra resposta sem comentário pai no CRM como card marcado", () => {
    const threads = buildCommentThreads([
      row({ id: "r1", kind: "reply", externalId: "c9", parentId: "fora-do-crm" }),
      row({ id: "b1", kind: "brand_reply", externalId: "b9", inReplyTo: "c9" }),
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0]?.orphanReply).toBe(true);
    expect(threads[0]?.replies[0]?.fromBrand).toBe(true);
  });
});
