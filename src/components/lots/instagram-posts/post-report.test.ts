import { describe, expect, it } from "vitest";
import { buildPostReport } from "./post-report";
import type { IgMediaRow } from "@/modules/instagram-posts/types";

function post(id: string, metrics: IgMediaRow["metrics"], product = "REELS"): IgMediaRow {
  return {
    id,
    cadastro_cliente_id: 1,
    ig_media_id: id,
    media_product_type: product,
    media_type: "VIDEO",
    caption: "teste",
    permalink: null,
    media_url: null,
    thumbnail_url: null,
    thumbnail_storage_path: null,
    published_at: "2026-09-10T12:00:00.000Z",
    metrics,
    metrics_collected_at: "2026-09-11T01:00:00.000Z",
    last_synced_at: "2026-09-11T01:00:00.000Z",
    content_card_id: null,
  };
}

describe("buildPostReport", () => {
  it("marca alcance acima da média e comentários abaixo", () => {
    const selected = post("a", {
      views: 100,
      reach: 200,
      likes: 10,
      comments: 1,
      total_interactions: 12,
    });
    const peers = [
      post("b", { views: 100, reach: 100, likes: 10, comments: 10, total_interactions: 20 }),
      post("c", { views: 100, reach: 100, likes: 10, comments: 10, total_interactions: 20 }),
    ];
    const report = buildPostReport(selected, [selected, ...peers]);
    const reach = report.comparisons.find((row) => row.key === "reach");
    const comments = report.comparisons.find((row) => row.key === "comments");
    expect(reach?.average).toBe(100);
    expect(reach?.band).toBe("strong");
    expect(comments?.band).toBe("weak");
    expect(report.sampleSize).toBe(2);
    expect(report.headline.toLowerCase()).toContain("alcance");
  });

  it("sem pares não inventa média", () => {
    const selected = post("solo", { views: 50, reach: 40 });
    const report = buildPostReport(selected, [selected]);
    expect(report.sampleSize).toBe(0);
    expect(report.comparisons.every((row) => row.average == null)).toBe(true);
    expect(report.headline).toMatch(/Única/i);
  });
});
