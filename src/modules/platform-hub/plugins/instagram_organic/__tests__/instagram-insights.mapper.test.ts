import { describe, expect, it } from "vitest";
import { insightMetricsForProductType, mapInsightsToMetrics } from "../api/instagram-insights.mapper";

describe("instagram-insights.mapper", () => {
  it("selects metrics by product type", () => {
    expect(insightMetricsForProductType("REELS")).toContain("ig_reels_avg_watch_time");
    expect(insightMetricsForProductType("STORY")).toContain("replies");
  });

  it("maps insights and media counts", () => {
    const metrics = mapInsightsToMetrics(
      {
        data: [
          { name: "views", values: [{ value: 120 }] },
          { name: "saved", values: [{ value: 4 }] },
        ],
      },
      { id: "1", like_count: 10, comments_count: 2 },
    );
    expect(metrics.views).toBe(120);
    expect(metrics.saves).toBe(4);
    expect(metrics.likes).toBe(10);
    expect(metrics.comments).toBe(2);
  });
});
