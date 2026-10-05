import { describe, expect, it } from "vitest";
import { buildPlatformCatalog, isHubWizardConnectable } from "../build-catalog";

describe("Hub wizard catalog", () => {
  it("mostra Google, TikTok e YouTube e esconde Google Business", () => {
    expect(isHubWizardConnectable("tiktok")).toBe(true);
    expect(isHubWizardConnectable("youtube")).toBe(true);
    expect(isHubWizardConnectable("google_ads")).toBe(true);
    expect(isHubWizardConnectable("ga4")).toBe(true);
    expect(isHubWizardConnectable("google_business")).toBe(false);
    expect(isHubWizardConnectable("meta_ads")).toBe(true);
    const catalog = buildPlatformCatalog(new Map());
    expect(catalog.map((item) => item.key)).toContain("google_ads");
    expect(catalog.map((item) => item.key)).toContain("tiktok");
    expect(catalog.map((item) => item.key)).not.toContain("google_business");
  });
});
