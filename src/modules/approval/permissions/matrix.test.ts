import { describe, expect, it } from "vitest";
import { roleCan } from "./matrix";

describe("permissions matrix", () => {
  it("admin can do everything", () => {
    expect(roleCan("admin", "delete")).toBe(true);
    expect(roleCan("admin", "archive")).toBe(true);
  });

  it("social_media cannot approve or delete", () => {
    expect(roleCan("social_media", "edit")).toBe(true);
    expect(roleCan("social_media", "approve")).toBe(false);
    expect(roleCan("social_media", "delete")).toBe(false);
  });

  it("cliente can view, comment, approve and request changes only", () => {
    expect(roleCan("cliente", "view")).toBe(true);
    expect(roleCan("cliente", "comment")).toBe(true);
    expect(roleCan("cliente", "approve")).toBe(true);
    expect(roleCan("cliente", "request_changes")).toBe(true);
    expect(roleCan("cliente", "edit")).toBe(false);
    expect(roleCan("cliente", "move")).toBe(false);
    expect(roleCan("cliente", "upload_material")).toBe(true);
    expect(roleCan("cliente", "upload_final")).toBe(false);
  });
});
