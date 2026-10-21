import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("88_metric_cadastro_id.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/88_metric_cadastro_id.sql"),
    "utf8",
  );

  it("grava cadastro_cliente_id e slug por organização, sem fin_*", () => {
    expect(sql).toContain("cadastro_cliente_id");
    expect(sql).toContain("uq_base_metricas_hub_cadastro_key");
    expect(sql).toContain("cadastro_clientes_organization_slug_key");
    expect(sql).toContain("current_user_cadastro_cliente_ids");
    expect(sql).not.toMatch(/\bfin_(cobrancas|nfse|pagamentos|recibos|config)\b/);
  });
});
