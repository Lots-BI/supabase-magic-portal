import { describe, expect, it } from "vitest";
import { brandAuthor, isBrandAuthor, shouldSkipComment } from "./skip-rules";

describe("isBrandAuthor", () => {
  const brand = brandAuthor(["1784"], ["@RodrigoAdvs", "Rodrigo Advocacia", null]);

  it("matches the brand by Instagram id", () => {
    expect(isBrandAuthor({ id: "1784", username: "outro" }, brand)).toBe(true);
  });

  it("matches the brand by username regardless of @ and case", () => {
    expect(isBrandAuthor({ username: "rodrigoadvs" }, brand)).toBe(true);
  });

  it("ignores labels that are not usernames", () => {
    expect(isBrandAuthor({ username: "rodrigo advocacia" }, brand)).toBe(false);
  });

  it("keeps audience authors", () => {
    expect(isBrandAuthor({ id: "999", username: "ana" }, brand)).toBe(false);
  });
});

describe("shouldSkipComment", () => {
  it("skips the brand's own username", () => {
    expect(
      shouldSkipComment({ id: "1", username: "marca.oficial", text: "obrigado" }, "marca.oficial"),
    ).toBe(true);
  });

  it("skips hidden comments", () => {
    expect(shouldSkipComment({ id: "1", username: "ana", hidden: true }, "marca")).toBe(true);
  });

  it("keeps a public audience comment", () => {
    expect(shouldSkipComment({ id: "1", username: "ana", text: "quero" }, "marca.oficial")).toBe(
      false,
    );
  });
});
