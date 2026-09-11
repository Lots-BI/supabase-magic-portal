import { describe, expect, it } from "vitest";
import { shouldSkipComment } from "./skip-rules";

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
