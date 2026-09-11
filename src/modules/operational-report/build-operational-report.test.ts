import { describe, expect, it } from "vitest";
import { buildOperationalReport } from "./build-operational-report";
import type { Period } from "@/lib/period";
import type { Row } from "@/lib/platforms/engine";

const period: Period = {
  preset: "custom",
  from: "2026-09-01",
  to: "2026-09-10",
  prevFrom: "2026-08-22",
  prevTo: "2026-08-31",
  days: 10,
  label: "1–10 set",
};

function metaRow(data: string, spend: number, results: number): Row {
  return {
    data,
    cliente: "Acme",
    campanha: "Campanha A",
    spend,
    results,
    impressions: 1000,
    clicks: 40,
    messaging_conversations_started: 0,
  };
}

describe("buildOperationalReport", () => {
  it("resume investimento e resultados pagos vs período anterior", () => {
    const report = buildOperationalReport({
      clienteNome: "Acme",
      cadastroClienteId: 7,
      clienteSlug: "acme",
      period,
      platformRows: {
        meta_ads: [
          metaRow("2026-08-25", 80, 4),
          metaRow("2026-09-05", 120, 10),
        ],
      },
      postsCurrent: [],
      postsPrevious: [],
      cardsCurrent: [],
      cardsPrevious: [],
    });

    const spend = report.heroes.find((h) => h.key === "hero_spend");
    expect(spend?.value).toBe(120);
    expect(spend?.previous).toBe(80);
    expect(report.reading.headline.toLowerCase()).toContain("investiu");
    expect(report.platforms.map((p) => p.key)).toEqual(["meta_ads"]);
    expect(report.platforms[0]?.metrics.length).toBeLessThanOrEqual(3);
    expect(report.coverage.withData).toContain("Meta Ads");
    expect(report.coverage.withoutData).toEqual([]);
  });

  it("não inventa leitura quando não há coleta", () => {
    const report = buildOperationalReport({
      clienteNome: "Acme",
      cadastroClienteId: 7,
      clienteSlug: "acme",
      period,
      platformRows: {},
      postsCurrent: [],
      postsPrevious: [],
      cardsCurrent: [],
      cardsPrevious: [],
    });
    expect(report.reading.headline.toLowerCase()).toContain("ainda não há");
    expect(report.heroes).toHaveLength(0);
    expect(report.platforms).toHaveLength(0);
    expect(report.posts).toBeNull();
    expect(report.content).toBeNull();
  });

  it("inclui publicações e conteúdos no resumo", () => {
    const report = buildOperationalReport({
      clienteNome: "Acme",
      cadastroClienteId: 7,
      clienteSlug: "acme",
      period,
      platformRows: {},
      postsCurrent: [
        {
          id: "m1",
          published_at: "2026-09-05T12:00:00.000Z",
          media_product_type: "REELS",
          permalink: null,
          caption: "Peça nova",
          metrics: { views: 200, total_interactions: 20 },
        },
      ],
      postsPrevious: [
        {
          id: "m0",
          published_at: "2026-08-25T12:00:00.000Z",
          media_product_type: "FEED",
          permalink: null,
          caption: "Peça antiga",
          metrics: { views: 50, total_interactions: 5 },
        },
      ],
      cardsCurrent: [
        {
          id: "c1",
          status: "publicado",
          formato: "reels",
          data_publicacao: "2026-09-05",
          publish_status: "published",
        },
        {
          id: "c2",
          status: "agendado",
          formato: "estatico",
          data_publicacao: "2026-09-08",
          publish_status: "scheduled",
        },
      ],
      cardsPrevious: [],
    });

    expect(report.posts?.count).toBe(1);
    expect(report.posts?.views).toBe(200);
    expect(report.content?.planned).toBe(2);
    expect(report.content?.published).toBe(1);
    expect(report.platforms).toHaveLength(0);
    expect(report.reading.headline.toLowerCase()).toMatch(/publica/);
  });

  it("não inclui plataforma inativa nem inventário de métricas", () => {
    const report = buildOperationalReport({
      clienteNome: "Acme",
      cadastroClienteId: 7,
      clienteSlug: "acme",
      period,
      platformRows: {
        meta_ads: [metaRow("2026-09-05", 50, 3)],
        google_ads: [],
        instagram: [],
      },
      postsCurrent: [],
      postsPrevious: [],
      cardsCurrent: [],
      cardsPrevious: [],
    });

    expect(report.platforms.map((p) => p.key)).toEqual(["meta_ads"]);
    expect(report.platforms.find((p) => p.key === "google_ads")).toBeUndefined();
    expect(report.platforms.find((p) => p.key === "instagram")).toBeUndefined();
    expect(report.heroes.length).toBeLessThanOrEqual(4);
    expect(report.movers.length).toBeLessThanOrEqual(3);
  });
});
