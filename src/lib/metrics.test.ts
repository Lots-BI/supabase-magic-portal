import { describe, expect, it } from "vitest";
import { platformBreakdownByCliente, sumOverview, type OverviewRow } from "@/lib/metrics";
import { dailySeries, aggregate } from "@/lib/platforms/engine";
import { metaAdsDef } from "@/lib/platforms/meta-ads";
import type { Period } from "@/lib/period";

const period: Period = {
  preset: "custom",
  label: "Teste",
  days: 7,
  from: "2026-06-20",
  to: "2026-06-26",
  prevFrom: "2026-06-13",
  prevTo: "2026-06-19",
};

describe("sumOverview", () => {
  it("soma google_spend e meta_spend por dia", () => {
    const rows: OverviewRow[] = [
      {
        data: "2026-06-20",
        cliente: "Acme",
        meta_spend: 100,
        google_spend: 50,
        total_impressions: 1000,
        total_clicks: 10,
        ga4_sessions: 5,
        ga4_conversions: 1,
        instagram_reach: 200,
        instagram_interactions: 20,
      },
      {
        data: "2026-06-21",
        cliente: "Acme",
        meta_spend: 80,
        google_spend: 40,
        total_impressions: 800,
        total_clicks: 8,
        ga4_sessions: 4,
        ga4_conversions: 0,
        instagram_reach: 250,
        instagram_interactions: 15,
      },
    ];
    const t = sumOverview(rows);
    expect(t.meta_spend).toBe(180);
    expect(t.google_spend).toBe(90);
    expect(t.spend).toBe(270);
    expect(t.reach).toBe(250);
    expect(t.conversions).toBe(1);
  });

  it("conta resultados Meta + GA4 + Google, sem somar pixel Meta em dobro", () => {
    const t = sumOverview([
      {
        data: "2026-06-20",
        cliente: "Acme",
        meta_spend: 100,
        google_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        ga4_sessions: 0,
        ga4_conversions: 2,
        instagram_reach: 0,
        instagram_interactions: 0,
        meta_results: 10,
        meta_conversions: 3,
        google_conversions: 1,
      },
    ]);
    expect(t.conversions).toBe(13);
  });
});

describe("platformBreakdownByCliente", () => {
  it("separa plataformas e usa o maior alcance do Instagram no período", () => {
    const rows: OverviewRow[] = [
      {
        data: "2026-06-20",
        cliente: "Acme",
        meta_spend: 100,
        google_spend: 40,
        total_impressions: 0,
        total_clicks: 0,
        ga4_sessions: 20,
        ga4_conversions: 2,
        instagram_reach: 200,
        instagram_interactions: 8,
        meta_results: 4,
        google_conversions: 1,
      },
      {
        data: "2026-06-21",
        cliente: "Acme",
        meta_spend: 50,
        google_spend: 10,
        total_impressions: 0,
        total_clicks: 0,
        ga4_sessions: 5,
        ga4_conversions: 1,
        instagram_reach: 80,
        instagram_interactions: 3,
        meta_results: 1,
        google_conversions: 2,
      },
      {
        data: "2026-06-20",
        cliente: "Beta",
        meta_spend: 0,
        google_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        ga4_sessions: 0,
        ga4_conversions: 0,
        instagram_reach: 900,
        instagram_interactions: 12,
      },
    ];

    const byCliente = new Map(
      platformBreakdownByCliente(rows).map((row) => [row.cliente, row] as const),
    );
    const acme = byCliente.get("Acme");
    const beta = byCliente.get("Beta");

    expect(acme?.meta).toEqual({ spend: 150, results: 5 });
    expect(acme?.google).toEqual({ spend: 50, conversions: 3 });
    expect(acme?.ga4).toEqual({ sessions: 25, conversions: 3 });
    expect(acme?.instagram).toEqual({ reach: 200, interactions: 11 });
    expect(acme?.spend).toBe(200);
    expect(acme?.conversions).toBe(11);
    expect(beta?.instagram.reach).toBe(900);
  });
});

describe("engine dailySeries", () => {
  it("usa MAX para reach em métricas max (meta)", () => {
    const rows = [
      {
        data: "2026-06-20",
        cliente: "Acme",
        campanha: "A",
        reach: 100,
        impressions: 500,
        clicks: 10,
        spend: 50,
      },
      {
        data: "2026-06-20",
        cliente: "Acme",
        campanha: "B",
        reach: 80,
        impressions: 300,
        clicks: 5,
        spend: 30,
      },
    ];
    const daily = dailySeries(metaAdsDef, rows, period);
    const day = daily.find((d) => d.date === "2026-06-20");
    expect(day?.reach).toBe(100);
    expect(day?.impressions).toBe(800);
  });

  it("agrega reach do período com MAX", () => {
    const rows = [
      {
        data: "2026-06-20",
        cliente: "Acme",
        campanha: "A",
        reach: 100,
        impressions: 500,
        clicks: 10,
        spend: 50,
      },
      {
        data: "2026-06-21",
        cliente: "Acme",
        campanha: "A",
        reach: 150,
        impressions: 400,
        clicks: 8,
        spend: 40,
      },
    ];
    const totals = aggregate(metaAdsDef, rows, period);
    expect(totals.reach).toBe(150);
    expect(totals.spend).toBe(90);
  });
});
