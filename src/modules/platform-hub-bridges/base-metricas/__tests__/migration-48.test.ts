import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("48_base_metricas_hub_natural_key.sql", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations-official/48_base_metricas_hub_natural_key.sql"),
    "utf8",
  );

  it("versiona unique natural key e RPC replace-by-day", () => {
    expect(sql).toContain("uq_base_metricas_hub_natural_key");
    expect(sql).toContain("replace_hub_metric_days");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.replace_hub_metric_days");
    expect(sql).toContain("TO service_role");
    expect(sql).not.toMatch(/DELETE FROM public\.base_metricas_make/);
  });
});
