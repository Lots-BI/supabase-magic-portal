import { describe, expect, it } from "vitest";
import {
  REPORT_ANALYST_CAMPAIGN_CAP,
  REPORT_ANALYST_POST_CAP,
  buildReportAnalystContext,
  insightsForOperationalReport,
  plainTextToNoteHtml,
  truncateAnalystText,
} from "./report-analyst-context";
import type { OperationalReport, ReportCampaign } from "@/modules/operational-report/types";

function report(overrides: Partial<OperationalReport> = {}): OperationalReport {
  return {
    clienteNome: "Acme",
    cadastroClienteId: 7,
    clienteSlug: "acme",
    period: {
      from: "2026-09-01",
      to: "2026-09-10",
      prevFrom: "2026-08-22",
      prevTo: "2026-08-31",
      label: "1–10 set",
      days: 10,
    },
    reading: {
      headline: "Investiu R$ 200 e gerou 10 resultados.",
      mood: "up",
      moodLabel: "No ritmo",
    },
    heroes: [
      {
        key: "hero_spend",
        label: "Investimento",
        value: 200,
        previous: 100,
        deltaPct: 100,
        format: "currency",
        positiveIsGood: true,
        kind: "metric",
      },
      {
        key: "hero_results",
        label: "Resultados",
        value: 10,
        previous: 4,
        deltaPct: 150,
        format: "int",
        positiveIsGood: true,
        kind: "metric",
      },
    ],
    movers: [],
    pulse: null,
    mix: [],
    platforms: [],
    posts: null,
    content: null,
    coverage: { withData: [], withoutData: [], notes: [] },
    ...overrides,
  };
}

function campaigns(count: number): ReportCampaign[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Campanha ${index + 1}`,
    spend: (index + 1) * 10,
    results: index,
    clicks: index,
  }));
}

describe("buildReportAnalystContext", () => {
  it("inclui a leitura do relatório e os bullets de buildInsights", () => {
    const context = buildReportAnalystContext(report());
    expect(context.headline).toContain("Investiu");
    expect(context.moodLabel).toBe("No ritmo");
    expect(context.insights.map((item) => item.id)).toContain("spend-delta");
    expect(context.prompt).toContain("Sinais automáticos:");
    expect(context.prompt).toContain("Investimento aumentou");
    expect(context.prompt).not.toMatch(/causa inventada|orçamento secreto/i);
  });

  it("aceita bullets explícitos e não troca por outros", () => {
    const context = buildReportAnalystContext(report(), [
      {
        id: "manual",
        title: "Sinal passado pelo teste",
        detail: "Só este.",
        tone: "neutral",
      },
    ]);
    expect(context.insights).toHaveLength(1);
    expect(context.prompt).toContain("Sinal passado pelo teste");
    expect(context.prompt).not.toContain("Investimento aumentou");
  });

  it("limita campanhas e publicações e corta texto longo", () => {
    const longName = "N".repeat(400);
    const context = buildReportAnalystContext(
      report({
        platforms: [
          {
            key: "meta_ads",
            label: "Meta Ads",
            family: "paid",
            description: "d",
            href: "/cliente/acme/meta-ads",
            hasData: true,
            lastDay: "2026-09-10",
            metrics: [],
            campaigns: campaigns(6),
            daily: [],
            dailyMetricKey: null,
          },
          {
            key: "google_ads",
            label: "Google Ads",
            family: "paid",
            description: "d",
            href: "/cliente/acme/google-ads",
            hasData: true,
            lastDay: "2026-09-10",
            metrics: [],
            campaigns: campaigns(6).map((campaign) => ({
              ...campaign,
              name: `${longName} ${campaign.name}`,
              spend: campaign.spend + 1000,
            })),
            daily: [],
            dailyMetricKey: null,
          },
        ],
        posts: {
          count: 12,
          previousCount: 1,
          views: 20,
          previousViews: 10,
          interactions: 4,
          previousInteractions: 1,
          highlights: Array.from({ length: 14 }, (_, index) => ({
            id: `p${index}`,
            publishedAt: "2026-09-05T12:00:00.000Z",
            productType: "REELS",
            title: `Peça ${index}`,
            views: index,
            interactions: 1,
            permalink: null,
          })),
        },
      }),
    );

    const campaignLines = context.prompt.split("\n").filter((line) => line.includes(" / "));
    expect(campaignLines.length).toBeLessThanOrEqual(REPORT_ANALYST_CAMPAIGN_CAP);
    const postLines = context.prompt.split("\n").filter((line) => line.includes("Peça "));
    expect(postLines).toHaveLength(REPORT_ANALYST_POST_CAP);
    expect(context.prompt).not.toContain(longName);
    expect(context.prompt).toContain("…");
  });

  it("não inventa herói quando o relatório está vazio", () => {
    const empty = report({
      reading: {
        headline: "Ainda não há métricas coletadas em 1–10 set.",
        mood: "steady",
        moodLabel: "Estável",
      },
      heroes: [],
    });
    const context = buildReportAnalystContext(empty);
    expect(insightsForOperationalReport(empty)).toEqual([]);
    expect(context.prompt).toContain("Heróis: nenhum.");
    expect(context.prompt).toContain("Sinais automáticos: nenhum.");
  });
});

describe("plainTextToNoteHtml", () => {
  it("escapa HTML e preserva parágrafos", () => {
    expect(plainTextToNoteHtml("Olá <script>\n\nlinha")).toBe(
      "<p>Olá &lt;script&gt;</p><p>linha</p>",
    );
  });
});

describe("truncateAnalystText", () => {
  it("não corta texto curto", () => {
    expect(truncateAnalystText("curto")).toBe("curto");
  });
});
