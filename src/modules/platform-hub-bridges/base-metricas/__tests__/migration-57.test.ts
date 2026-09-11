import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("57_overview_paid_conversions.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/57_overview_paid_conversions.sql"),
    "utf8",
  );

  it("adiciona results Meta no fim da view e do RPC", () => {
    expect(sql).toContain("AS instagram_interactions,");
    expect(sql).toContain("AS meta_results");
    expect(sql).toContain("AS meta_conversions");
    expect(sql).toContain("AS google_conversions");
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.portfolio_overview(date, date)");
    expect(sql).toContain("n.plataforma = 'meta_ads' AND n.metrica = 'results'");
  });
});
