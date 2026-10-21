import { describe, expect, it } from "vitest";
import {
  mapMetaHierarchyInsights,
  parseStructureCampaignKey,
  structureCampaignKey,
} from "../api/meta-structure";

describe("meta structure", () => {
  it("marca turbinação e não mistura o gasto da campanha", () => {
    const rows = mapMetaHierarchyInsights(
      [
        {
          date_start: "2026-10-19",
          date_stop: "2026-10-19",
          campaign_id: "c1",
          campaign_name: "Sempre on",
          adset_id: "s1",
          adset_name: "Público A",
          ad_id: "a1",
          ad_name: "Post do feed",
          spend: "12.5",
          impressions: "100",
          instagram_profile_follow: "4",
        },
      ],
      {
        level: "ad",
        boostedAdIds: new Set(["a1"]),
        campaignObjectives: new Map([["c1", "OUTCOME_ENGAGEMENT"]]),
      },
    );

    const spend = rows.find((row) => row.metricKey === "nx_spend");
    expect(parseStructureCampaignKey(spend?.campaign ?? "")).toMatchObject({
      level: "ad",
      boosted: true,
      campaign: "Sempre on",
      adset: "Público A",
      ad: "Post do feed",
    });
    expect(rows.find((row) => row.metricKey === "spend")).toBeUndefined();
    expect(rows.find((row) => row.metricKey === "instagram_profile_follows")).toBeUndefined();
    expect(rows.find((row) => row.metricKey === "nx_instagram_follows")?.value).toBe(4);
  });

  it("roundtrip da chave", () => {
    const key = structureCampaignKey({
      level: "adset",
      boosted: false,
      campaign: "Campanha",
      adset: "Conjunto",
      ad: "",
    });
    expect(parseStructureCampaignKey(key)?.level).toBe("adset");
  });

  it("lê conjunto gravado sem o campo vazio do anúncio", () => {
    expect(parseStructureCampaignKey("nx\tadset\t0\tLanding Page\tPúblico A")).toMatchObject({
      level: "adset",
      boosted: false,
      campaign: "Landing Page",
      adset: "Público A",
      ad: "",
    });
  });
});
