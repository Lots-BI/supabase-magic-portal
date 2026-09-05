import { describe, expect, it } from "vitest";
import { sanitizeOAuthRedirectAfter } from "../sanitize-redirect";

describe("sanitizeOAuthRedirectAfter", () => {
  it("aceita paths internos do admin", () => {
    expect(sanitizeOAuthRedirectAfter("/admin/conexoes/nova?step=4")).toBe(
      "/admin/conexoes/nova?step=4",
    );
    expect(sanitizeOAuthRedirectAfter("/admin/conexoes/abc-uuid")).toBe("/admin/conexoes/abc-uuid");
  });

  it("rejeita URLs externas", () => {
    expect(() => sanitizeOAuthRedirectAfter("https://evil.com/admin")).toThrow();
    expect(() => sanitizeOAuthRedirectAfter("//evil.com/path")).toThrow();
  });

  it("rejeita paths fora do escopo", () => {
    expect(() => sanitizeOAuthRedirectAfter("/dashboard")).toThrow();
  });

  it("aceita a aba de conexões do portal cliente", () => {
    expect(sanitizeOAuthRedirectAfter("/cliente/agencia-lots/conexoes?connectionId=abc")).toBe(
      "/cliente/agencia-lots/conexoes?connectionId=abc",
    );
    expect(sanitizeOAuthRedirectAfter("/cliente/agencia-lots/conexoes")).toBe(
      "/cliente/agencia-lots/conexoes",
    );
  });

  it("rejeita paths do cliente fora da aba de conexões", () => {
    expect(() => sanitizeOAuthRedirectAfter("/cliente/agencia-lots/publicacoes")).toThrow();
  });
});
