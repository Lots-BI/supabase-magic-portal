import { describe, expect, it } from "vitest";
import { coverageGap } from "./coverage";

describe("coverageGap", () => {
  it("is media comments minus identified comments", () => {
    expect(coverageGap(10, 4)).toEqual({
      mediaComments: 10,
      identifiedComments: 4,
      gap: 6,
    });
  });

  it("does not go negative", () => {
    expect(coverageGap(2, 5).gap).toBe(0);
  });
});
