import { describe, expect, it } from "vitest";
import { buildPlatformCatalog, isHubWizardConnectable } from "../build-catalog";

describe("Hub wizard catalog", () => {
  it("esconde TikTok, YouTube, GBP e Google até OAuth/coleta pronta", () => {
    expect(isHubWizardConnectable("tiktok")).toBe(false);
    expect(isHubWizardConnectable("youtube")).toBe(false);
    expect(isHubWizardConnectable("google_business")).toBe(false);
    expect(isHubWizardConnectable("google_ads")).toBe(false);
    expect(isHubWizardConnectable("ga4")).toBe(false);
    expect(isHubWizardConnectable("meta_ads")).toBe(true);
    const catalog = buildPlatformCatalog(new Map());
    expect(catalog.map((item) => item.key)).not.toContain("tiktok");
    expect(catalog.map((item) => item.key)).not.toContain("youtube");
    expect(catalog.map((item) => item.key)).not.toContain("google_ads");
  });
});
