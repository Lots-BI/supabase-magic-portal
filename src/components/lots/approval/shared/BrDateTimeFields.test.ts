import { describe, expect, it } from "vitest";
import { horaToDbValue, isValidTime24h } from "./BrDateTimeFields";

describe("horaToDbValue", () => {
  it("persists valid HH:mm as HH:mm:ss", () => {
    expect(horaToDbValue("16:00")).toBe("16:00:00");
  });

  it("clears empty time", () => {
    expect(horaToDbValue("")).toBe(null);
    expect(horaToDbValue("  ")).toBe(null);
  });

  it("skips incomplete typing", () => {
    expect(horaToDbValue("1")).toBe(false);
    expect(horaToDbValue("16:")).toBe(false);
    expect(isValidTime24h("25:00")).toBe(false);
    expect(horaToDbValue("25:00")).toBe(false);
  });
});
