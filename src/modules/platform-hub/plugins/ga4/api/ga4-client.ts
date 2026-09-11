import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { parseRetryAfterMs, RateLimitHttpError } from "../../_internal/http/fetch-http-client";
import { paginateCursorPages } from "../../_internal/http/paginate-cursor";
import type { Ga4ReportRowV1, Ga4RunReportResponseV1 } from "./ga4-api.types";

export interface Ga4ClientConfig {
  httpClient: HttpClientPort;
  apiVersion?: string;
}

export interface FetchGa4MetricsInput {
  accessToken: string;
  propertyId: string;
  window: { from: string; to: string };
  maxPages?: number;
}

export interface FetchGa4MetricsResult {
  rows: Ga4ReportRowV1[];
  pagesFetched: number;
  rateLimitHit: boolean;
}

function normalizePropertyId(externalId: string): string {
  const trimmed = externalId.trim();
  return trimmed.startsWith("properties/") ? trimmed : `properties/${trimmed}`;
}

function ga4BaseUrl(version: string): string {
  return `https://analyticsdata.googleapis.com/${version}`;
}

function throwGa4HttpError(error: unknown): never {
  if (error instanceof HttpClientError) {
    if (error.status === 401) {
      throw new HttpClientError("GA4 authentication failed", 401, error.body);
    }
    if (error.status === 429) {
      throw new RateLimitHttpError(error.message, parseRetryAfterMs({}));
    }
  }
  throw error;
}

/** Cliente GA4 Data API — mockável via HttpClientPort. */
export class Ga4Client {
  private readonly apiVersion: string;

  constructor(private readonly config: Ga4ClientConfig) {
    this.apiVersion = config.apiVersion ?? "v1beta";
  }

  async fetchDailyMetrics(input: FetchGa4MetricsInput): Promise<FetchGa4MetricsResult> {
    const propertyId = normalizePropertyId(input.propertyId);
    const baseUrl = `${ga4BaseUrl(this.apiVersion)}/${propertyId}:runReport`;
    let rateLimitHit = false;

    const { items, pagesFetched } = await paginateCursorPages({
      maxPages: input.maxPages,
      fetchPage: async (pageToken) => {
        try {
          const response = await this.config.httpClient.request(baseUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dateRanges: [{ startDate: input.window.from, endDate: input.window.to }],
              dimensions: [{ name: "date" }],
              metrics: [
                { name: "activeUsers" },
                { name: "sessions" },
                { name: "engagedSessions" },
                { name: "screenPageViews" },
                { name: "eventCount" },
                { name: "conversions" },
              ],
              pageToken,
            }),
          });

          const body = await response.json<Ga4RunReportResponseV1>();
          return {
            data: body.rows ?? [],
            nextCursor: body.nextPageToken,
          };
        } catch (error) {
          if (error instanceof RateLimitHttpError) {
            rateLimitHit = true;
          }
          throwGa4HttpError(error);
        }
      },
    });

    return { rows: items, pagesFetched, rateLimitHit };
  }
}
