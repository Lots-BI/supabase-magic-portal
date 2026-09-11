import { describe, expect, it } from "vitest";
import { mergeDashboardPlatforms } from "./dashboard-accounts";

describe("mergeDashboardPlatforms", () => {
  it("mantém plataformas do Make e acrescenta Meta Ads conectado no Hub", () => {
    expect(
      mergeDashboardPlatforms(["instagram", "google_ads", "ga4"], ["meta_ads", "instagram_organic"]),
    ).toEqual(expect.arrayContaining(["instagram", "google_ads", "ga4", "meta_ads"]));
  });

  it("mostra Meta Ads só com conexão Hub, sem métricas Make", () => {
    expect(mergeDashboardPlatforms([], ["meta_ads"])).toEqual(["meta_ads"]);
  });

  it("normaliza chaves com hífen vindas da view", () => {
    expect(mergeDashboardPlatforms(["meta-ads"], [])).toEqual(["meta_ads"]);
  });
});
