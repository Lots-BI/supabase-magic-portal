import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("89_hub_dedupe_cadastro_twins.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/89_hub_dedupe_cadastro_twins.sql"),
    "utf8",
  );

  it("apaga a série sem id quando a gêmea com cadastro existe", () => {
    expect(sql).toContain("a.cadastro_cliente_id IS NULL");
    expect(sql).toContain("b.cadastro_cliente_id IS NOT NULL");
    expect(sql).toContain("OR (h.cliente = p_cliente AND h.cadastro_cliente_id IS NULL)");
    expect(sql).toContain("COALESCE(NULLIF(r->>'cadastro_cliente_id', '')::bigint, v_cadastro)");
    expect(sql).not.toMatch(/\bfin_(cobrancas|nfse|pagamentos|recibos|config)\b/);
  });
});
