import { describe, expect, it } from "vitest";
import { combineBrazilSchedule, shouldRefreshSchedule } from "./brazil-schedule";

describe("combineBrazilSchedule", () => {
  it("converts Brasília 16:00 to 19:00 UTC", () => {
    expect(combineBrazilSchedule("2026-09-10", "16:00:00")).toBe("2026-09-10T19:00:00.000Z");
  });

  it("accepts HH:mm without seconds", () => {
    expect(combineBrazilSchedule("2026-09-10", "10:00")).toBe("2026-09-10T13:00:00.000Z");
  });

  it("defaults to 16:00 Brasília when time is missing", () => {
    expect(combineBrazilSchedule("2026-09-10", null)).toBe("2026-09-10T19:00:00.000Z");
  });
});

describe("shouldRefreshSchedule", () => {
  it("keeps a live publishing/published timestamp", () => {
    expect(shouldRefreshSchedule("publishing")).toBe(false);
    expect(shouldRefreshSchedule("published")).toBe(false);
    expect(shouldRefreshSchedule("scheduled")).toBe(true);
  });
});
