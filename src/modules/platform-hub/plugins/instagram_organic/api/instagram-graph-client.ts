import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { paginateCursorPages } from "../../_internal/http/paginate-cursor";
import type {
  InstagramMediaListResponseV1,
  InstagramMediaRowV1,
  InstagramInsightsResponseV1,
  InstagramAccountInsightsResponseV1,
} from "./instagram-api.types";
import { insightMetricsForProductType } from "./instagram-insights.mapper";
import { ACCOUNT_INSIGHTS_METRICS_PARAM } from "./instagram-account-insights.mapper";
import { spDayBoundsUnixSeconds } from "./date-utils";

export interface InstagramGraphClientConfig {
  httpClient: HttpClientPort;
  graphVersion?: string;
}

function graphBaseUrl(version: string): string {
  return `https://graph.facebook.com/${version}`;
}

const MEDIA_FIELDS =
  "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";

export class InstagramGraphClient {
  private readonly graphVersion: string;

  constructor(private readonly config: InstagramGraphClientConfig) {
    this.graphVersion = config.graphVersion ?? "v22.0";
  }

  async listMedia(
    accessToken: string,
    igUserId: string,
    maxPages = 10,
  ): Promise<InstagramMediaRowV1[]> {
    const baseUrl = `${graphBaseUrl(this.graphVersion)}/${igUserId}/media`;
    const { items } = await paginateCursorPages({
      maxPages,
      fetchPage: async (after) => {
        const response = await this.config.httpClient.request(baseUrl, {
          searchParams: {
            access_token: accessToken,
            fields: MEDIA_FIELDS,
            limit: "50",
            after,
          },
        });
        const body = await response.json<InstagramMediaListResponseV1>();
        if (body.error?.message) throw new Error(body.error.message);
        return {
          data: body.data ?? [],
          nextCursor: body.paging?.cursors?.after,
        };
      },
    });
    return items;
  }

  async listStories(accessToken: string, igUserId: string): Promise<InstagramMediaRowV1[]> {
    const url = `${graphBaseUrl(this.graphVersion)}/${igUserId}/stories`;
    const response = await this.config.httpClient.request(url, {
      searchParams: {
        access_token: accessToken,
        fields: MEDIA_FIELDS,
      },
    });
    const body = await response.json<InstagramMediaListResponseV1>();
    if (body.error?.message) throw new Error(body.error.message);
    return body.data ?? [];
  }

  async fetchMediaInsights(
    accessToken: string,
    mediaId: string,
    productType: string,
  ): Promise<InstagramInsightsResponseV1> {
    const metrics = insightMetricsForProductType(productType);
    const url = `${graphBaseUrl(this.graphVersion)}/${mediaId}/insights`;
    const response = await this.config.httpClient.request(url, {
      searchParams: {
        access_token: accessToken,
        metric: metrics.join(","),
      },
    });
    const body = await response.json<InstagramInsightsResponseV1>();
    if (body.error?.message) {
      // Story com poucos viewers ou métrica incompatível — retorna vazio
      if (body.error.code === 10 || body.error.code === 100) {
        return { data: [] };
      }
      throw new Error(body.error.message);
    }
    return body;
  }

  /**
   * Insights de CONTA para um único dia (period=day, metric_type=total_value).
   * Apenas `reach` suporta time_series; as demais métricas só total_value —
   * por isso pedimos o dia inteiro (since 00:00 → until 00:00 do dia seguinte,
   * fuso America/Sao_Paulo) em uma única chamada com todas as métricas.
   */
  async fetchAccountInsightsForDay(
    accessToken: string,
    igUserId: string,
    date: string,
  ): Promise<InstagramAccountInsightsResponseV1> {
    const { sinceUnix, untilUnix } = spDayBoundsUnixSeconds(date);
    const url = `${graphBaseUrl(this.graphVersion)}/${igUserId}/insights`;
    const response = await this.config.httpClient.request(url, {
      searchParams: {
        access_token: accessToken,
        metric: ACCOUNT_INSIGHTS_METRICS_PARAM,
        period: "day",
        metric_type: "total_value",
        since: String(sinceUnix),
        until: String(untilUnix),
      },
    });
    const body = await response.json<InstagramAccountInsightsResponseV1>();
    if (body.error?.message) {
      // Dia sem dados suficientes para estimar métricas — trata como vazio.
      if (body.error.code === 10 || body.error.code === 100) {
        return { data: [] };
      }
      throw new Error(body.error.message);
    }
    return body;
  }
}
