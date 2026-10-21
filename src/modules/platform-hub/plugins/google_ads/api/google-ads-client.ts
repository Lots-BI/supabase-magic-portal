import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { parseRetryAfterMs, RateLimitHttpError } from "../../_internal/http/fetch-http-client";
import { paginateCursorPages } from "../../_internal/http/paginate-cursor";
import type { GoogleAdsSearchResponseV1, GoogleAdsSearchRowV1 } from "./google-ads-api.types";
import { GOOGLE_ADS_REST_API_VERSION, googleAdsBaseUrl } from "./google-ads-api-version";

export interface GoogleAdsClientConfig {
  httpClient: HttpClientPort;
  apiVersion?: string;
  developerToken?: string;
}

export interface FetchGoogleAdsMetricsInput {
  accessToken: string;
  customerId: string;
  loginCustomerId?: string;
  window: { from: string; to: string };
  maxPages?: number;
}

export interface FetchGoogleAdsMetricsResult {
  rows: GoogleAdsSearchRowV1[];
  pagesFetched: number;
  rateLimitHit: boolean;
}

function normalizeCustomerId(externalId: string): string {
  return externalId.replace(/-/g, "").replace(/^customers\//, "");
}

function throwGoogleAdsHttpError(error: unknown): never {
  if (error instanceof HttpClientError) {
    if (error.status === 401) {
      throw new HttpClientError("Google Ads authentication failed", 401, error.body);
    }
    if (error.status === 429) {
      throw new RateLimitHttpError(error.message, parseRetryAfterMs({}));
    }
  }
  throw error;
}

/** Cliente Google Ads API — mockável via HttpClientPort. */
export class GoogleAdsClient {
  private readonly apiVersion: string;

  constructor(private readonly config: GoogleAdsClientConfig) {
    this.apiVersion = config.apiVersion ?? GOOGLE_ADS_REST_API_VERSION;
  }

  async fetchCampaignMetrics(
    input: FetchGoogleAdsMetricsInput,
  ): Promise<FetchGoogleAdsMetricsResult> {
    const customerId = normalizeCustomerId(input.customerId);
    const baseUrl = `${googleAdsBaseUrl(this.apiVersion)}/customers/${customerId}/googleAds:search`;
    let rateLimitHit = false;

    const query = [
      "SELECT campaign.id, campaign.name, campaign.status, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros",
      "FROM campaign",
      `WHERE segments.date BETWEEN '${input.window.from}' AND '${input.window.to}'`,
    ].join(" ");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    };
    if (this.config.developerToken) {
      headers["developer-token"] = this.config.developerToken;
    } else {
      const envToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
      if (envToken) headers["developer-token"] = envToken;
    }
    if (input.loginCustomerId) {
      headers["login-customer-id"] = normalizeCustomerId(input.loginCustomerId);
    }

    const { items, pagesFetched } = await paginateCursorPages({
      maxPages: input.maxPages,
      fetchPage: async (pageToken) => {
        try {
          const response = await this.config.httpClient.request(baseUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ query, pageToken }),
          });

          const body = await response.json<GoogleAdsSearchResponseV1>();
          return {
            data: body.results ?? [],
            nextCursor: body.nextPageToken,
          };
        } catch (error) {
          if (error instanceof RateLimitHttpError) {
            rateLimitHit = true;
          }
          throwGoogleAdsHttpError(error);
        }
      },
    });

    return { rows: items, pagesFetched, rateLimitHit };
  }
}
