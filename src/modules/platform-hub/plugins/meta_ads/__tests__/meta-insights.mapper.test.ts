import { describe, expect, it } from "vitest";
import { mapMetaInsightsToMetricRows, pickResultsValue } from "../api/meta-insights.mapper";
import type { MetaInsightRowV1 } from "../api/meta-api.types";

const base: MetaInsightRowV1 = {
  campaign_name: "Campanha A",
  campaign_id: "111",
  date_start: "2026-09-01",
  date_stop: "2026-09-01",
  impressions: "1000",
  reach: "800",
  clicks: "50",
  spend: "25.50",
};

describe("mapMetaInsightsToMetricRows", () => {
  it("mapeia delivery + conversions + results (0 quando a API não manda ações)", () => {
    const rows = mapMetaInsightsToMetricRows([base]);
    expect(rows.find((r) => r.metricKey === "spend")?.value).toBe(25.5);
    expect(rows.find((r) => r.metricKey === "conversions")?.value).toBe(0);
    expect(rows.find((r) => r.metricKey === "results")?.value).toBe(0);
    expect(rows).toHaveLength(6);
  });

  it("soma o campo conversions da Insights API", () => {
    const rows = mapMetaInsightsToMetricRows([
      {
        ...base,
        conversions: [
          { action_type: "lead", value: "3" },
          { action_type: "purchase", value: "1" },
        ],
      },
    ]);
    expect(rows.find((r) => r.metricKey === "conversions")?.value).toBe(4);
  });

  it("escolhe o resultado primário (compra) e não soma com cliques", () => {
    const insight: MetaInsightRowV1 = {
      ...base,
      actions: [
        { action_type: "link_click", value: "40" },
        { action_type: "purchase", value: "2" },
        { action_type: "landing_page_view", value: "10" },
      ],
      conversions: [{ action_type: "purchase", value: "2" }],
    };
    expect(pickResultsValue(insight)).toBe(2);
    const rows = mapMetaInsightsToMetricRows([insight]);
    expect(rows.find((r) => r.metricKey === "results")?.value).toBe(2);
    expect(rows.find((r) => r.metricKey === "conversions")?.value).toBe(2);
  });

  it("usa lead quando não há compra", () => {
    expect(
      pickResultsValue({
        ...base,
        actions: [
          { action_type: "lead", value: "5" },
          { action_type: "link_click", value: "20" },
        ],
      }),
    ).toBe(5);
  });

  it("cai para soma de conversions se nenhuma action de resultado existir", () => {
    expect(
      pickResultsValue({
        ...base,
        actions: [{ action_type: "page_engagement", value: "9" }],
        conversions: [{ action_type: "offsite_conversion.custom", value: "7" }],
      }),
    ).toBe(7);
  });

  it("usa evento custom do pixel (OUTCOME_SALES) e não landing page / cliques", () => {
    const insight: MetaInsightRowV1 = {
      ...base,
      actions: [
        { action_type: "link_click", value: "141" },
        { action_type: "landing_page_view", value: "103" },
        { action_type: "video_view", value: "558" },
        { action_type: "offsite_conversion.custom.796869900110776", value: "2" },
      ],
      conversions: [],
    };
    expect(pickResultsValue(insight, "OUTCOME_SALES")).toBe(2);
    const rows = mapMetaInsightsToMetricRows([insight], {
      campaignObjectives: new Map([["111", "OUTCOME_SALES"]]),
    });
    expect(rows.find((r) => r.metricKey === "results")?.value).toBe(2);
    expect(rows.find((r) => r.metricKey === "conversions")?.value).toBe(2);
  });

  it("campanha de venda sem conversão fica 0 — não usa LPV nem mensagem", () => {
    const insight: MetaInsightRowV1 = {
      ...base,
      actions: [
        { action_type: "link_click", value: "24" },
        { action_type: "landing_page_view", value: "18" },
        { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "2" },
      ],
    };
    expect(pickResultsValue(insight, "OUTCOME_SALES")).toBe(0);
    expect(pickResultsValue(insight)).toBe(0);
  });

  it("campanha de tráfego usa landing page / clique", () => {
    expect(
      pickResultsValue(
        {
          ...base,
          actions: [
            { action_type: "landing_page_view", value: "18" },
            { action_type: "link_click", value: "24" },
          ],
        },
        "OUTCOME_TRAFFIC",
      ),
    ).toBe(18);
  });
});
