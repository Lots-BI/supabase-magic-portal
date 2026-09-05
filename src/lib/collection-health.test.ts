import { describe, expect, it } from "vitest";
import { assessCollectionHealth, eachIsoDay } from "./collection-health";

describe("collection-health", () => {
  it("lista dias ISO inclusive", () => {
    expect(eachIsoDay("2026-09-01", "2026-09-03")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
  });

  it("considera em dia quando todas as plataformas cobrem até ontem", () => {
    const health = assessCollectionHealth({
      today: "2026-09-05",
      knownPlatforms: ["meta_ads", "ga4"],
      rows: [
        { plataforma: "meta_ads", data: "2026-09-03" },
        { plataforma: "meta_ads", data: "2026-09-04" },
        { plataforma: "ga4", data: "2026-09-03" },
        { plataforma: "ga4", data: "2026-09-04" },
      ],
      lookbackDays: 3,
    });
    expect(health.expectedEnd).toBe("2026-09-04");
    expect(health.overall).toBe("ok");
    expect(health.title).toBe("Coleta em dia");
    expect(health.platforms.every((p) => p.status === "ok")).toBe(true);
  });

  it("detecta buracos no meio da série mesmo com último dia recente", () => {
    const health = assessCollectionHealth({
      today: "2026-09-05",
      knownPlatforms: ["meta_ads"],
      rows: [
        { plataforma: "meta_ads", data: "2026-09-01" },
        { plataforma: "meta_ads", data: "2026-09-04" },
      ],
      lookbackDays: 4,
    });
    const meta = health.platforms.find((p) => p.key === "meta_ads");
    expect(meta?.status).toBe("gaps");
    expect(meta?.missingDates).toEqual(["2026-09-02", "2026-09-03"]);
    expect(health.overall).toBe("warning");
    expect(health.title).toBe("Coleta incompleta");
  });

  it("marca plataforma ativa sem dados recentes como falha", () => {
    const health = assessCollectionHealth({
      today: "2026-09-05",
      knownPlatforms: ["instagram", "meta_ads"],
      rows: [
        { plataforma: "meta_ads", data: "2026-09-03" },
        { plataforma: "meta_ads", data: "2026-09-04" },
      ],
      lookbackDays: 4,
    });
    const ig = health.platforms.find((p) => p.key === "instagram");
    expect(ig?.status).toBe("empty");
    expect(health.overall).toBe("alert");
    expect(health.title).toBe("Coleta com falha");
  });

  it("marca atraso quando o último dia está atrás de ontem", () => {
    const health = assessCollectionHealth({
      today: "2026-09-05",
      knownPlatforms: ["ga4"],
      rows: [
        { plataforma: "ga4", data: "2026-08-30" },
        { plataforma: "ga4", data: "2026-08-31" },
        { plataforma: "ga4", data: "2026-09-01" },
        { plataforma: "ga4", data: "2026-09-02" },
      ],
      lookbackDays: 7,
    });
    const ga4 = health.platforms.find((p) => p.key === "ga4");
    expect(ga4?.lagDays).toBe(2);
    expect(ga4?.status).toBe("delayed");
    expect(health.overall).toBe("warning");
  });
});
