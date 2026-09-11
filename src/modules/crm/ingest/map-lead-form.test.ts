import { describe, expect, it } from "vitest";
import { mapLeadForm } from "./map-lead-form";

describe("mapLeadForm", () => {
  it("stores email and phone only from structured fields", () => {
    const mapped = mapLeadForm({
      id: "lead-1",
      createdTime: "2026-09-11T10:00:00.000Z",
      fieldData: [
        { name: "email", values: ["Ana@Marca.com"] },
        { name: "phone_number", values: ["11988887777"] },
        { name: "custom_question", values: ["meu outro email é x@y.com"] },
      ],
    });
    expect(mapped?.facts.map((f) => f.field).sort()).toEqual(["email", "phone"]);
    expect(mapped?.identities.some((i) => i.kind === "email" && i.value === "ana@marca.com")).toBe(
      true,
    );
    expect(mapped?.facts.some((f) => f.value.includes("x@y.com"))).toBe(false);
  });
});
