import { describe, expect, it } from "vitest";
import { groupIntoContiguousRanges, listMissingDates } from "../instagram-profile-gap-finder";

describe("instagram-profile-gap-finder", () => {
  describe("listMissingDates", () => {
    it("returns all dates when nothing exists yet", () => {
      expect(listMissingDates("2026-01-01", "2026-01-03", new Set())).toEqual([
        "2026-01-01",
        "2026-01-02",
        "2026-01-03",
      ]);
    });

    it("excludes dates already present", () => {
      const existing = new Set(["2026-01-02"]);
      expect(listMissingDates("2026-01-01", "2026-01-03", existing)).toEqual([
        "2026-01-01",
        "2026-01-03",
      ]);
    });

    it("returns an empty array when every day is already present", () => {
      const existing = new Set(["2026-01-01", "2026-01-02", "2026-01-03"]);
      expect(listMissingDates("2026-01-01", "2026-01-03", existing)).toEqual([]);
    });
  });

  describe("groupIntoContiguousRanges", () => {
    it("returns an empty array for no dates", () => {
      expect(groupIntoContiguousRanges([])).toEqual([]);
    });

    it("groups a single contiguous run into one range", () => {
      expect(groupIntoContiguousRanges(["2026-01-01", "2026-01-02", "2026-01-03"])).toEqual([
        { from: "2026-01-01", to: "2026-01-03" },
      ]);
    });

    it("splits non-contiguous dates into separate ranges", () => {
      expect(
        groupIntoContiguousRanges(["2026-01-01", "2026-01-02", "2026-01-10", "2026-01-11"]),
      ).toEqual([
        { from: "2026-01-01", to: "2026-01-02" },
        { from: "2026-01-10", to: "2026-01-11" },
      ]);
    });

    it("sorts unordered input before grouping", () => {
      expect(groupIntoContiguousRanges(["2026-01-03", "2026-01-01", "2026-01-02"])).toEqual([
        { from: "2026-01-01", to: "2026-01-03" },
      ]);
    });

    it("handles isolated single-day ranges", () => {
      expect(groupIntoContiguousRanges(["2026-01-05"])).toEqual([
        { from: "2026-01-05", to: "2026-01-05" },
      ]);
    });
  });
});
