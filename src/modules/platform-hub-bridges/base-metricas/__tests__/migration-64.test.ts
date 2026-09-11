import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("64_portfolio_rpc_security_definer.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/64_portfolio_rpc_security_definer.sql"),
    "utf8",
  );

  it("turns dashboard RPCs into SECURITY DEFINER without changing signatures", () => {
    expect(sql).toContain("ALTER FUNCTION public.portfolio_overview(date, date) SECURITY DEFINER");
    expect(sql).toContain("ALTER FUNCTION public.portfolio_clientes_ativos() SECURITY DEFINER");
    expect(sql).toContain(
      "ALTER FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) SECURITY DEFINER",
    );
    expect(sql).toContain("ALTER FUNCTION public.dashboard_coverage(text, date) SECURITY DEFINER");
    expect(sql).not.toContain("DROP FUNCTION");
  });
});
