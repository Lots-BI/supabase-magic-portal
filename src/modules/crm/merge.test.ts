import { describe, expect, it } from "vitest";
import { assertCanMerge, identitiesAfterMerge } from "./merge";

const ana = {
  id: "a",
  cadastroClienteId: 1,
  mergedIntoId: null,
  isVip: false,
};
const bruno = {
  id: "b",
  cadastroClienteId: 1,
  mergedIntoId: null,
  isVip: true,
};

describe("assertCanMerge", () => {
  it("keeps VIP if either person is VIP", () => {
    expect(assertCanMerge(ana, bruno).vip).toBe(true);
    expect(assertCanMerge(bruno, ana).vip).toBe(true);
  });

  it("rejects cross-client merge", () => {
    expect(() => assertCanMerge(ana, { ...bruno, cadastroClienteId: 2 })).toThrow(/mesma marca/);
  });

  it("rejects already merged source", () => {
    expect(() => assertCanMerge({ ...ana, mergedIntoId: "x" }, bruno)).toThrow(/já foi unida/);
  });
});

describe("identitiesAfterMerge", () => {
  it("drops duplicate kind+value from the source", () => {
    const { keepFrom, dropFrom } = identitiesAfterMerge(
      [
        { kind: "ig_username", value: "ana", personId: "a" },
        { kind: "email", value: "ana@x.com", personId: "a" },
      ],
      [{ kind: "ig_username", value: "ana", personId: "b" }],
    );
    expect(dropFrom).toHaveLength(1);
    expect(keepFrom).toEqual([{ kind: "email", value: "ana@x.com", personId: "a" }]);
  });
});
