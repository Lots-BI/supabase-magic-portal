import { describe, expect, it } from "vitest";
import { createHubRegistry } from "./create-hub-registry";
import { GlobPluginLoader } from "./glob-plugin-loader";
import { HubRegistry } from "./hub-registry";

const EXPECTED_CATALOG = [
  { key: "example", label: "Example" },
  { key: "ga4", label: "GA4" },
  { key: "google_ads", label: "Google Ads" },
  { key: "google_business", label: "Google Business" },
  { key: "instagram_organic", label: "Instagram" },
  { key: "meta_ads", label: "Meta" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
] as const;

describe("GlobPluginLoader", () => {
  it("descobre plugins automaticamente via register.ts", () => {
    const loader = new GlobPluginLoader();
    const registrations = loader.load();

    expect(registrations.length).toBe(EXPECTED_CATALOG.length);
    expect(registrations.map((plugin) => plugin.manifest.key)).toEqual(
      EXPECTED_CATALOG.map((plugin) => plugin.key),
    );
  });

  it("retorna ordem determinística em boots consecutivos", () => {
    const first = new GlobPluginLoader().load().map((plugin) => plugin.manifest.key);
    const second = new GlobPluginLoader().load().map((plugin) => plugin.manifest.key);

    expect(first).toEqual(second);
    expect(first).toEqual(EXPECTED_CATALOG.map((plugin) => plugin.key));
  });

  it("não duplica plugins no catálogo", () => {
    const loader = new GlobPluginLoader();
    const keys = loader.load().map((plugin) => plugin.manifest.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("integra com HubRegistry sem runtime, banco ou OAuth", () => {
    const loader = new GlobPluginLoader();
    const registry = new HubRegistry();
    registry.register(...loader.load());

    const catalog = registry.getAllPlugins().map((plugin) => ({
      key: plugin.manifest.key,
      label: plugin.manifest.label,
    }));

    expect(catalog).toEqual([...EXPECTED_CATALOG]);
  });

  it("createHubRegistry monta catálogo completo", () => {
    const registry = createHubRegistry();
    const labels = registry.getAllPlugins().map((plugin) => plugin.manifest.label);

    expect(labels).toEqual(EXPECTED_CATALOG.map((plugin) => plugin.label));
  });

  it("findByCapability resolve plugins marketing sem casos especiais", () => {
    const registry = createHubRegistry();

    expect(registry.findByCapability("meta:metrics:collect")[0]?.manifest.key).toBe("meta_ads");
    expect(registry.findByCapability("tiktok:metrics:collect")[0]?.manifest.key).toBe("tiktok");
    expect(registry.findByCapability("gbp:metrics:collect")[0]?.manifest.key).toBe(
      "google_business",
    );
    expect(registry.findByCapability("example:metrics:collect")[0]?.manifest.key).toBe("example");
  });
});
