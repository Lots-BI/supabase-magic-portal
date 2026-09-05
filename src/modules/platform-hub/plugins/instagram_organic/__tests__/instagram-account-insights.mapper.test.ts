import { describe, expect, it } from "vitest";
import { mapAccountInsightsDayToMetricRows } from "../api/instagram-account-insights.mapper";

describe("instagram-account-insights.mapper", () => {
  it("maps total_value insights to MetricRowV1 with the requested date", () => {
    const rows = mapAccountInsightsDayToMetricRows(
      {
        data: [
          { name: "reach", total_value: { value: 1200 } },
          { name: "total_interactions", total_value: { value: 340 } },
          { name: "accounts_engaged", total_value: { value: 150 } },
          { name: "likes", total_value: { value: 200 } },
          { name: "comments", total_value: { value: 12 } },
          { name: "saves", total_value: { value: 8 } },
          { name: "shares", total_value: { value: 5 } },
          { name: "profile_links_taps", total_value: { value: 3 } },
        ],
      },
      "2026-01-15",
    );

    expect(rows).toHaveLength(8);
    expect(rows).toEqual(
      expect.arrayContaining([
        { metricKey: "reach", value: 1200, date: "2026-01-15" },
        { metricKey: "total_interactions", value: 340, date: "2026-01-15" },
        { metricKey: "profile_links_taps", value: 3, date: "2026-01-15" },
      ]),
    );
  });

  it("ignores unknown metrics and missing/invalid total_value", () => {
    const rows = mapAccountInsightsDayToMetricRows(
      {
        data: [
          { name: "reach", total_value: { value: 10 } },
          { name: "follower_count", total_value: { value: 999 } },
          { name: "likes", total_value: {} },
          { name: "comments" },
        ],
      },
      "2026-01-16",
    );

    expect(rows).toEqual([{ metricKey: "reach", value: 10, date: "2026-01-16" }]);
  });

  it("returns an empty array when there is no data", () => {
    expect(mapAccountInsightsDayToMetricRows({ data: [] }, "2026-01-17")).toEqual([]);
    expect(mapAccountInsightsDayToMetricRows({}, "2026-01-17")).toEqual([]);
  });
});
