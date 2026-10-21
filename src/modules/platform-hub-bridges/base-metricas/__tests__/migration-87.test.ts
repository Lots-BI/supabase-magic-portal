import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("87_org_security_hardening.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/87_org_security_hardening.sql"),
    "utf8",
  );

  it("fecha EXECUTE das RPCs perigosas e a policy aberta de aliases", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.access_invalidate_auth_sessions");
    expect(sql).toContain("FROM anon, authenticated");
    expect(sql).toContain("DROP POLICY IF EXISTS cliente_aliases_select_auth");
    expect(sql).not.toMatch(/\bfin_(cobrancas|nfse|pagamentos|recibos|config)\b/);
  });
});
