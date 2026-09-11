import { describe, expect, it } from "vitest";
import { pivotLongMetricRows } from "./pivot-long";
import { metaAdsDef } from "./meta-ads";
import { ga4Def } from "./ga4";
import { instagramDef } from "./instagram";

describe("pivotLongMetricRows", () => {
  it("agrupa métricas Meta por dia e campanha", () => {
    const rows = pivotLongMetricRows(metaAdsDef, [
      { data: "2026-09-05", cliente: "Acme", campanha: "A", metrica: "spend", valor: 40 },
      { data: "2026-09-05", cliente: "Acme", campanha: "A", metrica: "results", valor: 3 },
      { data: "2026-09-05", cliente: "Acme", campanha: "B", metrica: "spend", valor: 10 },
    ]);
    expect(rows).toHaveLength(2);
    const a = rows.find((row) => row.campanha === "A");
    expect(a?.spend).toBe(40);
    expect(a?.results).toBe(3);
  });

  it("mapeia métricas GA4 e Instagram da nomenclatura Hub", () => {
    const ga = pivotLongMetricRows(ga4Def, [
      { data: "2026-09-05", cliente: "Acme", metrica: "activeusers", valor: 12 },
      { data: "2026-09-05", cliente: "Acme", metrica: "sessions", valor: 40 },
    ]);
    expect(ga[0]?.active_users).toBe(12);
    expect(ga[0]?.sessions).toBe(40);

    const ig = pivotLongMetricRows(instagramDef, [
      { data: "2026-09-05", cliente: "Acme", metrica: "total_interactions", valor: 9 },
      { data: "2026-09-05", cliente: "Acme", metrica: "views", valor: 100 },
    ]);
    expect(ig[0]?.interactions).toBe(9);
    expect(ig[0]?.views).toBe(100);
  });
});
