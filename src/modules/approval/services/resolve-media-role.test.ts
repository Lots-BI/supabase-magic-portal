import { describe, expect, it } from "vitest";
import { persistMediaRole, resolveUploadMediaRole } from "./resolve-media-role";

describe("resolveUploadMediaRole", () => {
  it("forces client uploads to cliente_material even if final is requested", () => {
    expect(resolveUploadMediaRole("cliente", "final")).toBe("cliente_material");
    expect(resolveUploadMediaRole("cliente", "attachment")).toBe("cliente_material");
    expect(resolveUploadMediaRole("cliente", undefined)).toBe("cliente_material");
  });

  it("lets staff upload the finished piece as final", () => {
    expect(resolveUploadMediaRole("admin", "final")).toBe("final");
    expect(resolveUploadMediaRole("social_media", "final")).toBe("final");
  });
});

describe("persistMediaRole", () => {
  it("never remaps client material or final", () => {
    expect(persistMediaRole("cliente_material", 0)).toBe("cliente_material");
    expect(persistMediaRole("final", 0)).toBe("final");
  });

  it("keeps first generic attachment as preview", () => {
    expect(persistMediaRole("attachment", 0)).toBe("preview");
    expect(persistMediaRole("attachment", 2)).toBe("attachment");
  });
});
