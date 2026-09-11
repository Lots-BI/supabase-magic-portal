import { describe, expect, it } from "vitest";
import { mapMetaInsightsToMetricRows, markerRowsForUncoveredDates, pickResultsValue } from "../api/meta-insights.mapper";
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
    expect(rows.find((r) => r.metricKey === "inline_link_clicks")?.value).toBe(0);
    expect(rows.find((r) => r.metricKey === "video_views")?.value).toBe(0);
    expect(rows.find((r) => r.metricKey === "unique_clicks")).toBeUndefined();
    expect(rows.find((r) => r.metricKey === "messaging_conversations_started")?.value).toBe(0);
    expect(rows).toHaveLength(14);
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
    // Sem objective: a conversa conta (caso Rodrigo / WhatsApp). LPV não.
    expect(pickResultsValue(insight)).toBe(2);
  });

  it("usa o field oficial results da Insights API (coluna do Gerenciador)", () => {
    const insight: MetaInsightRowV1 = {
      ...base,
      actions: [{ action_type: "landing_page_view", value: "103" }],
      results: [{ indicator: "actions:landing_page_view", value: "103" }],
    };
    expect(pickResultsValue(insight, "OUTCOME_SALES")).toBe(103);
  });

  it("aceita objective_results com values[] aninhado", () => {
    expect(
      pickResultsValue({
        ...base,
        objective_results: [
          {
            indicator: "actions:link_click",
            values: [{ value: "24" }],
          },
        ],
      }),
    ).toBe(24);
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

  it("extrai cliques no link, LPV e visualizações de vídeo das actions", () => {
    const rows = mapMetaInsightsToMetricRows([
      {
        ...base,
        inline_link_clicks: "12",
        unique_clicks: "9",
        actions: [
          { action_type: "link_click", value: "12" },
          { action_type: "landing_page_view", value: "7" },
          { action_type: "video_view", value: "40" },
          { action_type: "post_engagement", value: "15" },
        ],
      },
    ]);
    expect(rows.find((r) => r.metricKey === "inline_link_clicks")?.value).toBe(12);
    expect(rows.find((r) => r.metricKey === "unique_clicks")?.value).toBe(9);
    expect(rows.find((r) => r.metricKey === "link_clicks")?.value).toBe(12);
    expect(rows.find((r) => r.metricKey === "landing_page_views")?.value).toBe(7);
    expect(rows.find((r) => r.metricKey === "video_views")?.value).toBe(40);
    expect(rows.find((r) => r.metricKey === "post_engagements")?.value).toBe(15);
    expect(rows.find((r) => r.metricKey === "page_engagements")?.value).toBe(0);
  });

  it("conversa no WhatsApp vira Resultado e métrica própria", () => {
    const insight: MetaInsightRowV1 = {
      ...base,
      actions: [
        { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "1" },
        { action_type: "post_engagement", value: "20" },
        { action_type: "link_click", value: "3" },
      ],
    };
    expect(pickResultsValue(insight)).toBe(1);
    expect(pickResultsValue(insight, "OUTCOME_TRAFFIC")).toBe(1);
    expect(pickResultsValue(insight, "MESSAGES")).toBe(1);
    const rows = mapMetaInsightsToMetricRows([insight]);
    expect(rows.find((r) => r.metricKey === "messaging_conversations_started")?.value).toBe(1);
    expect(rows.find((r) => r.metricKey === "results")?.value).toBe(1);
  });
});

describe("markerRowsForUncoveredDates", () => {
  it("marca dias sem insight para o gap-finder não repetir o intervalo", () => {
    const rows = markerRowsForUncoveredDates(
      { from: "2026-09-01", to: "2026-09-03" },
      ["2026-09-02"],
    );
    expect(rows.filter((r) => r.date === "2026-09-01")).toHaveLength(2);
    expect(rows.filter((r) => r.date === "2026-09-02")).toHaveLength(0);
    expect(rows.find((r) => r.metricKey === "results" && r.date === "2026-09-03")?.value).toBe(0);
  });
});
