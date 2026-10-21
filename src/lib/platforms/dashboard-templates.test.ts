import { describe, expect, it } from "vitest";
import { PERSONALIZADO_ID, templateFits, visibleCardIds } from "./dashboard-templates";

const meta = [
  "metric:spend",
  "metric:results",
  "metric:clicks",
  "metric:impressions",
  "metric:video_views",
  "kpi:ctr",
  "kpi:cpa",
  "kpi:cpc",
];

describe("dashboard templates", () => {
  it("pulso fica em quatro cards, na prioridade do template", () => {
    expect(visibleCardIds(meta, "pulso")).toEqual([
      "metric:spend",
      "metric:results",
      "kpi:cpa",
      "kpi:ctr",
    ]);
  });

  it("vídeo some quando a plataforma não tem o funil", () => {
    expect(templateFits(meta, "video")).toBe(false);
    expect(templateFits(["metric:video_views", "metric:video_thruplay"], "video")).toBe(true);
  });

  it("tudo devolve a lista inteira", () => {
    expect(visibleCardIds(meta, "tudo")).toEqual(meta);
  });

  it("recorte salvo usa os cards na ordem gravada", () => {
    const custom = [
      {
        id: PERSONALIZADO_ID,
        label: "Reunião",
        cardIds: ["kpi:ctr", "metric:spend", "metric:missing"],
      },
    ];
    expect(visibleCardIds(meta, PERSONALIZADO_ID, custom)).toEqual(["kpi:ctr", "metric:spend"]);
  });
});
