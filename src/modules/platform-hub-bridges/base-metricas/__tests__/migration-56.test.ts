import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("56_portfolio_overview_single_pass.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/56_portfolio_overview_single_pass.sql"),
    "utf8",
  );

  it("reescreve overview em um passe e expõe RPC com filtro de data", () => {
    const overviewChunk = sql.slice(
      sql.indexOf("CREATE OR REPLACE VIEW public.vw_overview_cliente"),
      sql.indexOf("CREATE OR REPLACE VIEW public.vw_clientes_ativos"),
    );
    expect(overviewChunk).toContain("SUM(valor) FILTER (WHERE plataforma = 'meta_ads' AND metrica = 'spend')");
    expect(overviewChunk).not.toContain("UNION ALL");
    expect(sql).not.toContain("AS MATERIALIZED");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.portfolio_overview");
    expect(sql).toContain("AND h.data >= p_from");
    expect(sql).toContain("AND h.data <= p_to");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.portfolio_clientes_ativos");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.portfolio_overview");
  });
});
