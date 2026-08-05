import { describe, expect, it } from "vitest";
import {
  calendarDateInTimeZone,
  defaultMetaCollectWindow,
  shiftIsoDate,
} from "../providers/official-meta.provider";

describe("Meta collect window (America/Sao_Paulo)", () => {
  it("shiftIsoDate move dias civis", () => {
    expect(shiftIsoDate("2026-08-04", -1)).toBe("2026-08-03");
    expect(shiftIsoDate("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("defaultMetaCollectWindow cobre 7 dias inclusivos", () => {
    const fixed = new Date("2026-08-05T15:00:00.000-03:00");
    const w = defaultMetaCollectWindow(fixed, "America/Sao_Paulo", 6);
    expect(w.to).toBe(calendarDateInTimeZone(fixed, "America/Sao_Paulo"));
    expect(w.from).toBe(shiftIsoDate(w.to, -6));
  });
});
