import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("55_overview_query_timeout.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/55_overview_query_timeout.sql"),
    "utf8",
  );

  it("evita inline de current_user_clientes e materializa prefer_hub", () => {
    expect(sql).toContain("LANGUAGE plpgsql");
    expect(sql).not.toContain("FROM public.base_metricas_make bm");
    expect(sql).toContain("AS MATERIALIZED");
    expect(sql).toContain("(SELECT public.has_role(auth.uid(), 'admin'))");
  });
});
