import { describe, expect, it } from "vitest";
import { averageMetricValues, summarizePosts } from "./format-metrics";

describe("summarizePosts", () => {
  it("soma métricas e conta publicações", () => {
    const summary = summarizePosts([
      { metrics: { views: 10, reach: 8, likes: 2, total_interactions: 3 } },
      { metrics: { views: 5, reach: 4, comments: 1, total_interactions: 1 } },
    ]);
    expect(summary.publications).toBe(2);
    expect(summary.views).toBe(15);
    expect(summary.reach).toBe(12);
    expect(summary.likes).toBe(2);
    expect(summary.comments).toBe(1);
    expect(summary.interactions).toBe(4);
  });
});

describe("averageMetricValues", () => {
  it("média só das publicações que têm a métrica", () => {
    expect(
      averageMetricValues([
        { metrics: { views: 10, likes: 2 } },
        { metrics: { views: 30 } },
      ]),
    ).toEqual({ views: 20, likes: 2 });
  });
});

describe("summarizePosts", () => {
  it("soma métricas e conta publicações", () => {
    const summary = summarizePosts([
      { metrics: { views: 10, reach: 8, likes: 2, total_interactions: 3 } },
      { metrics: { views: 5, reach: 4, comments: 1, total_interactions: 1 } },
    ]);
    expect(summary.publications).toBe(2);
    expect(summary.views).toBe(15);
    expect(summary.reach).toBe(12);
    expect(summary.likes).toBe(2);
    expect(summary.comments).toBe(1);
    expect(summary.interactions).toBe(4);
  });
});
