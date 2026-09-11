import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("54_overview_prefer_hub_and_make_rls.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/54_overview_prefer_hub_and_make_rls.sql"),
    "utf8",
  );

  it("abre SELECT no Make para authenticated e reescreve vw_metricas prefer_hub", () => {
    expect(sql).toContain("base_metricas_make_select_authenticated");
    expect(sql).toContain("base_metricas_hub_client_select");
    expect(sql).toContain("CREATE OR REPLACE VIEW public.vw_metricas");
    expect(sql).toContain("hub_days");
    expect(sql).not.toMatch(/active_source = 'make'/);
    expect(sql).not.toMatch(/DELETE FROM public\.base_metricas_make/);
  });
});
