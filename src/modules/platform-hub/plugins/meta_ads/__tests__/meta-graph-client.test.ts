import { describe, expect, it } from "vitest";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { MockHttpClient } from "../../_internal/http/mock-http-client";
import {
  META_INSIGHTS_FIELDS_ACTIONS,
  META_INSIGHTS_FIELDS_FULL,
  META_INSIGHTS_FIELDS_WITH_RESULTS,
  MetaGraphClient,
  shouldRetryInsightsWithoutConversions,
  shouldRetryInsightsWithoutOfficialResults,
} from "../api/meta-graph-client";

describe("MetaGraphClient", () => {
  it("retenta sem conversions quando a Insights API recusa o field", async () => {
    const requestedFields: string[] = [];
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("/insights"),
        respond: (url) => {
          const fields = new URL(url).searchParams.get("fields") ?? "";
          requestedFields.push(fields);
          if (fields.includes("conversions")) {
            return {
              status: 400,
              body: {
                error: {
                  message: "(#100) Tried accessing nonexisting field (conversions)",
                  code: 100,
                },
              },
            };
          }
          return {
            body: {
              data: [
                {
                  campaign_name: "Campanha A",
                  campaign_id: "111",
                  date_start: "2026-09-01",
                  date_stop: "2026-09-01",
                  impressions: "10",
                  actions: [{ action_type: "offsite_conversion.custom.1", value: "2" }],
                },
              ],
            },
          };
        },
      },
    ]);

    const client = new MetaGraphClient({ httpClient });
    const result = await client.fetchCampaignInsights({
      accessToken: "token",
      adAccountId: "act_1",
      window: { from: "2026-09-01", to: "2026-09-01" },
    });

    expect(requestedFields[0]).toBe(META_INSIGHTS_FIELDS_WITH_RESULTS);
    expect(requestedFields[0]).toContain("conversions");
    expect(requestedFields[0]).toContain("inline_link_clicks");
    expect(requestedFields[1]).toBe(META_INSIGHTS_FIELDS_ACTIONS);
    expect(result.insights[0]?.actions?.[0]?.value).toBe("2");
  });

  it("retenta sem results quando a Insights API recusa o field oficial", async () => {
    const requestedFields: string[] = [];
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("/insights"),
        respond: (url) => {
          const fields = new URL(url).searchParams.get("fields") ?? "";
          requestedFields.push(fields);
          if (fields.includes("objective_results") || /(^|,)results(,|$)/.test(fields)) {
            return {
              status: 400,
              body: {
                error: {
                  message: "(#100) Tried accessing nonexisting field (results)",
                  code: 100,
                },
              },
            };
          }
          return {
            body: {
              data: [
                {
                  campaign_name: "Campanha A",
                  campaign_id: "111",
                  date_start: "2026-09-01",
                  date_stop: "2026-09-01",
                  impressions: "10",
                },
              ],
            },
          };
        },
      },
    ]);

    const client = new MetaGraphClient({ httpClient });
    const result = await client.fetchCampaignInsights({
      accessToken: "token",
      adAccountId: "act_1",
      window: { from: "2026-09-01", to: "2026-09-01" },
    });

    expect(requestedFields[0]).toBe(META_INSIGHTS_FIELDS_WITH_RESULTS);
    expect(requestedFields[1]).toBe(META_INSIGHTS_FIELDS_FULL);
    expect(result.insights[0]?.impressions).toBe("10");
  });
});

describe("shouldRetryInsightsWithoutOfficialResults", () => {
  it("retenta 400 que cita results ou objective_results", () => {
    expect(
      shouldRetryInsightsWithoutOfficialResults(
        new HttpClientError("HTTP 400: results", 400, "nonexisting field (results)"),
      ),
    ).toBe(true);
    expect(
      shouldRetryInsightsWithoutOfficialResults(
        new HttpClientError("HTTP 400", 400, "Tried accessing nonexisting field (objective_results)"),
      ),
    ).toBe(true);
    expect(
      shouldRetryInsightsWithoutOfficialResults(
        new HttpClientError("HTTP 400: conversions", 400, "invalid field conversions"),
      ),
    ).toBe(false);
  });
});

describe("shouldRetryInsightsWithoutConversions", () => {
  it("só retenta 400 que cita conversions", () => {
    expect(
      shouldRetryInsightsWithoutConversions(
        new HttpClientError("HTTP 400: conversions", 400, "invalid field conversions"),
      ),
    ).toBe(true);
    expect(
      shouldRetryInsightsWithoutConversions(new HttpClientError("HTTP 400: spend", 400, "spend")),
    ).toBe(false);
  });
});
