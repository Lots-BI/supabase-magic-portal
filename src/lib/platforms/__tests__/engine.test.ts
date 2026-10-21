import { describe, expect, it } from "vitest";
import { byCampaign, campaignGroupKey, platformViewSelect } from "../engine";
import { metaAdsDef } from "../meta-ads";
import { googleAdsDef } from "../google-ads";
import { ga4Def } from "../ga4";
import type { Period } from "@/lib/period";

const period: Period = {
  preset: "custom",
  from: "2026-09-01",
  to: "2026-09-02",
  prevFrom: "2026-08-30",
  prevTo: "2026-08-31",
  days: 2,
  label: "teste",
};

describe("byCampaign", () => {
  it("não lista marcadores de dia sem entrega (campanha vazia)", () => {
    const campaigns = byCampaign(
      metaAdsDef,
      [
        {
          data: "2026-09-01",
          cliente: "Rodrigo Borba",
          campanha: "",
          results: 0,
          conversions: 0,
        },
        {
          data: "2026-09-01",
          cliente: "Rodrigo Borba",
          campanha: "Campanha A",
          results: 2,
          spend: 10,
          clicks: 4,
        },
      ],
      period,
    );
    expect(campaigns.map((c) => c.campanha)).toEqual(["Campanha A"]);
  });

  it("não junta campanhas de mesmo nome em contas diferentes", () => {
    const campaigns = byCampaign(
      metaAdsDef,
      [
        {
          data: "2026-09-01",
          cliente: "Fernanda",
          campanha: "Campanha A",
          ad_account_id: "act_1",
          spend: 10,
        },
        {
          data: "2026-09-01",
          cliente: "Fernanda",
          campanha: "Campanha A",
          ad_account_id: "act_2",
          spend: 7,
        },
      ],
      period,
    );
    expect(campaigns).toHaveLength(2);
    expect(campaigns.map((item) => item.adAccountId).sort()).toEqual(["act_1", "act_2"]);
  });
});

describe("campaignGroupKey", () => {
  it("separa a mesma campanha em contas diferentes", () => {
    expect(campaignGroupKey("A", "act_1")).not.toBe(campaignGroupKey("A", "act_2"));
    expect(campaignGroupKey("A")).toBe(campaignGroupKey("A", ""));
  });
});

describe("platformViewSelect", () => {
  it("não pede colunas de KPI derivadas (ctr / engagement_rate)", () => {
    expect(platformViewSelect(googleAdsDef).split(",")).not.toContain("ctr");
    expect(platformViewSelect(ga4Def).split(",")).not.toContain("engagement_rate");
    expect(platformViewSelect(metaAdsDef).split(",")).not.toContain("ctr");
    expect(metaAdsDef.metrics.find((m) => m.key === "unique_clicks")?.aggregation.kind).toBe("max");
    expect(metaAdsDef.metrics.find((m) => m.key === "reach")?.aggregation.kind).toBe("max");
  });
});
