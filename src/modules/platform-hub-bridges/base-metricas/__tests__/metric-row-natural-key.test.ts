import { describe, expect, it } from "vitest";
import { excludeExistingMetricRows, metricRowNaturalKey } from "../metric-row-natural-key";

describe("excludeExistingMetricRows", () => {
  it("mantém results/conversions quando spend/clicks já existem no mesmo dia", () => {
    const incoming = [
      {
        cliente: "Antena Imobiliária",
        plataforma: "Meta Ads",
        metrica: "spend",
        data: "2026-09-04",
        campanha: "Lots - Antena PermaVenda",
        valor: 7.12,
      },
      {
        cliente: "Antena Imobiliária",
        plataforma: "Meta Ads",
        metrica: "results",
        data: "2026-09-04",
        campanha: "Lots - Antena PermaVenda",
        valor: 2,
      },
    ];

    const missing = excludeExistingMetricRows(incoming, [
      {
        cliente: "Antena Imobiliária",
        plataforma: "Meta Ads",
        metrica: "spend",
        data: "2026-09-04",
        campanha: "Lots - Antena PermaVenda",
      },
    ]);

    expect(missing.map((row) => row.metrica)).toEqual(["results"]);
  });

  it("distingue a mesma campanha em contas de anúncios diferentes", () => {
    expect(
      metricRowNaturalKey({
        cliente: "Fernanda",
        plataforma: "Meta Ads",
        metrica: "spend",
        data: "2026-10-01",
        campanha: "A",
        ad_account_id: "act_1",
      }),
    ).not.toBe(
      metricRowNaturalKey({
        cliente: "Fernanda",
        plataforma: "Meta Ads",
        metrica: "spend",
        data: "2026-10-01",
        campanha: "A",
        ad_account_id: "act_2",
      }),
    );
  });

  it("trata campanha nula como a unique COALESCE(campanha, '')", () => {
    expect(
      metricRowNaturalKey({
        cliente: "Acme",
        plataforma: "Instagram",
        metrica: "reach",
        data: "2026-09-01",
        campanha: null,
      }),
    ).toBe(
      metricRowNaturalKey({
        cliente: "Acme",
        plataforma: "Instagram",
        metrica: "reach",
        data: "2026-09-01",
        campanha: "",
      }),
    );
  });
});
