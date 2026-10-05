import { describe, expect, it } from "vitest";
import { draftPlatformAnalise, draftQuedaAnalise } from "./draft-analise";
import type { ReportCallout, ReportPlatformSection } from "./types";

function platformFixture(): ReportPlatformSection {
  return {
    key: "meta_ads",
    label: "Meta Ads",
    family: "paid",
    description: "",
    href: "/cliente/acme/meta-ads",
    hasData: true,
    lastDay: "2026-09-10",
    metrics: [
      {
        key: "spend",
        label: "Investimento",
        value: 500,
        previous: 300,
        deltaPct: 66.7,
        format: "currency",
        positiveIsGood: true,
        kind: "metric",
      },
      {
        key: "results",
        label: "Resultados",
        value: 10,
        previous: 20,
        deltaPct: -50,
        format: "int",
        positiveIsGood: true,
        kind: "metric",
      },
    ],
    campaigns: [{ name: "Campanha <A>", spend: 500, results: 10, clicks: 80 }],
    daily: [],
    dailyMetricKey: "spend",
  };
}

describe("draftPlatformAnalise", () => {
  it("lista métricas, nomeia o maior movimento e a campanha principal", () => {
    const html = draftPlatformAnalise(platformFixture(), "1–10 set");

    expect(html).toContain("Meta Ads em 1–10 set");
    expect(html).toContain("Investimento: R$\u00A0500 (era R$\u00A0300, +67%)");
    expect(html).toContain("Resultados: 10 (era 20, −50%)");
    // Maior movimento em módulo é o resultado caindo 50% (vs investimento subindo 67%)... então checa o investimento, que é maior.
    expect(html).toContain("Investimento subiu +67% no período");
    expect(html).toContain("Campanha de maior investimento");
    expect(html).toContain("Campanha &lt;A&gt;");
    expect(html).not.toContain("Campanha <A>");
    expect(html).toContain("[Complete com o contexto da conta");
  });

  it("não lista campanha fora de mídia paga", () => {
    const platform = { ...platformFixture(), family: "organic" as const };
    const html = draftPlatformAnalise(platform, "1–10 set");
    expect(html).not.toContain("Campanha de maior investimento");
  });
});

describe("draftQuedaAnalise", () => {
  it("lista movimentos negativos ordenados pelo maior módulo", () => {
    const movers: ReportCallout[] = [
      { id: "a", tone: "negative", title: "CPA", detail: "Meta Ads", deltaPct: -12 },
      { id: "b", tone: "negative", title: "Sessões", detail: "GA4", deltaPct: -40 },
      { id: "c", tone: "positive", title: "Views", detail: "Instagram", deltaPct: 20 },
    ];
    const html = draftQuedaAnalise(movers, "1–10 set");

    expect(html).toContain("Movimentos de queda em 1–10 set");
    const sessoesIndex = html.indexOf("Sessões");
    const cpaIndex = html.indexOf("CPA");
    expect(sessoesIndex).toBeGreaterThan(-1);
    expect(sessoesIndex).toBeLessThan(cpaIndex);
    expect(html).not.toContain("Views");
    expect(html).toContain("[Complete com a causa da queda");
  });

  it("sem movimento negativo, gera esqueleto para completar à mão", () => {
    const html = draftQuedaAnalise([], "1–10 set");
    expect(html).toContain("Nenhuma queda relevante identificada automaticamente");
    expect(html).toContain("[Descreva aqui o que causou a queda");
  });
});
