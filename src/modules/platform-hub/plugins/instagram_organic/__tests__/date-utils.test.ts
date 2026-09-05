import { describe, expect, it } from "vitest";
import {
  addDaysToDateStr,
  enumerateDatesInclusive,
  spDayBoundsUnixSeconds,
} from "../api/date-utils";

describe("date-utils", () => {
  it("adds and subtracts days preserving YYYY-MM-DD format", () => {
    expect(addDaysToDateStr("2026-02-27", 1)).toBe("2026-02-28");
    expect(addDaysToDateStr("2026-02-28", 1)).toBe("2026-03-01"); // 2026 não é bissexto
    expect(addDaysToDateStr("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("enumerates dates inclusive of both bounds", () => {
    expect(enumerateDatesInclusive("2026-01-01", "2026-01-03")).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
    expect(enumerateDatesInclusive("2026-01-05", "2026-01-05")).toEqual(["2026-01-05"]);
  });

  it("computes day bounds as America/Sao_Paulo midnight-to-midnight (UTC-3)", () => {
    const { sinceUnix, untilUnix } = spDayBoundsUnixSeconds("2026-01-15");
    // 2026-01-15 00:00 -03:00 == 2026-01-15 03:00 UTC
    expect(sinceUnix).toBe(Math.floor(Date.UTC(2026, 0, 15, 3, 0, 0) / 1000));
    expect(untilUnix - sinceUnix).toBe(24 * 60 * 60);
  });
});
