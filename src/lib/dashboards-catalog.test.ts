import { describe, expect, it } from "vitest";
import {
  catalogForPlatforms,
  dashboardNavTargets,
  normalizeDashboardPlatform,
  resolveDashboardPath,
} from "./dashboards-catalog";

describe("dashboards-catalog", () => {
  it("normaliza chaves de view e de rota", () => {
    expect(normalizeDashboardPlatform("meta_ads")).toBe("meta_ads");
    expect(normalizeDashboardPlatform("meta-ads")).toBe("meta_ads");
    expect(normalizeDashboardPlatform("google-business")).toBe("google_business");
    expect(normalizeDashboardPlatform("desconhecida")).toBeNull();
  });

  it("inclui publicações quando Instagram está ativo", () => {
    const ids = catalogForPlatforms(["instagram", "ga4"]).map((entry) => entry.id);
    expect(ids).toContain("instagram");
    expect(ids).toContain("publicacoes");
    expect(ids).toContain("ga4");
    expect(ids).not.toContain("meta_ads");
  });

  it("monta alvos de navegação só para plataformas ativas", () => {
    const targets = dashboardNavTargets("marca-x", ["instagram", "meta-ads", "ga4"]);
    expect(targets.map((entry) => entry.id)).toEqual([
      "meta_ads",
      "instagram",
      "publicacoes",
      "ga4",
    ]);
    expect(targets[0]?.params).toEqual({ cliente: "marca-x" });
    expect(resolveDashboardPath("/cliente/$cliente/instagram", { cliente: "marca-x" })).toBe(
      "/cliente/marca-x/instagram",
    );
  });
});
