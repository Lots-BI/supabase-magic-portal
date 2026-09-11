import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { paginateCursorPages } from "../../_internal/http/paginate-cursor";
import type {
  InstagramMediaListResponseV1,
  InstagramMediaRowV1,
  InstagramInsightsResponseV1,
  InstagramAccountInsightsResponseV1,
  InstagramCommentListResponseV1,
  InstagramCommentV1,
  InstagramConversationListResponseV1,
  InstagramConversationMessageV1,
  InstagramConversationMessagesResponseV1,
  InstagramConversationV1,
} from "./instagram-api.types";
import {
  insightMetricsCoreForProductType,
  insightMetricsForProductType,
} from "./instagram-insights.mapper";
import {
  ACCOUNT_INSIGHTS_CORE_METRICS_PARAM,
  ACCOUNT_INSIGHTS_METRICS_PARAM,
} from "./instagram-account-insights.mapper";
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

function isUnsupportedInsightError(error: unknown): boolean {
  if (!(error instanceof HttpClientError)) return false;
  if (error.status !== 400 && error.status !== 403) return false;
  const text = `${error.message}\n${error.body ?? ""}`.toLowerCase();
  return (
    text.includes("(#100)") ||
    text.includes("(#10)") ||
    text.includes('"code":100') ||
    text.includes('"code":10') ||
    text.includes("invalid metric") ||
    text.includes("nonexisting field") ||
    text.includes("does not support")
  );
}

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
    const full = insightMetricsForProductType(productType);
    const core = insightMetricsCoreForProductType(productType);
    const first = await this.requestMediaInsights(accessToken, mediaId, full);
    if (first.unsupported && full.join(",") !== core.join(",")) {
      const retry = await this.requestMediaInsights(accessToken, mediaId, core);
      return retry.body;
    }
    return first.body;
  }

  private async requestMediaInsights(
    accessToken: string,
    mediaId: string,
    metrics: readonly string[],
  ): Promise<{ body: InstagramInsightsResponseV1; unsupported: boolean }> {
    const url = `${graphBaseUrl(this.graphVersion)}/${mediaId}/insights`;
    try {
      const response = await this.config.httpClient.request(url, {
        searchParams: {
          access_token: accessToken,
          metric: metrics.join(","),
        },
      });
      const body = await response.json<InstagramInsightsResponseV1>();
      if (body.error?.message) {
        if (body.error.code === 10 || body.error.code === 100) {
          return { body: { data: [] }, unsupported: true };
        }
        throw new Error(body.error.message);
      }
      return { body, unsupported: false };
    } catch (error) {
      if (isUnsupportedInsightError(error)) {
        return { body: { data: [] }, unsupported: true };
      }
      throw error;
    }
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
    const first = await this.requestAccountInsightsForDay(
      accessToken,
      igUserId,
      date,
      ACCOUNT_INSIGHTS_METRICS_PARAM,
    );
    if (first.unsupported) {
      const retry = await this.requestAccountInsightsForDay(
        accessToken,
        igUserId,
        date,
        ACCOUNT_INSIGHTS_CORE_METRICS_PARAM,
      );
      return retry.body;
    }
    return first.body;
  }

  private async requestAccountInsightsForDay(
    accessToken: string,
    igUserId: string,
    date: string,
    metric: string,
  ): Promise<{ body: InstagramAccountInsightsResponseV1; unsupported: boolean }> {
    const { sinceUnix, untilUnix } = spDayBoundsUnixSeconds(date);
    const url = `${graphBaseUrl(this.graphVersion)}/${igUserId}/insights`;
    try {
      const response = await this.config.httpClient.request(url, {
        searchParams: {
          access_token: accessToken,
          metric,
          period: "day",
          metric_type: "total_value",
          since: String(sinceUnix),
          until: String(untilUnix),
        },
      });
      const body = await response.json<InstagramAccountInsightsResponseV1>();
      if (body.error?.message) {
        if (body.error.code === 10 || body.error.code === 100) {
          return { body: { data: [] }, unsupported: true };
        }
        throw new Error(body.error.message);
      }
      return { body, unsupported: false };
    } catch (error) {
      if (isUnsupportedInsightError(error)) {
        return { body: { data: [] }, unsupported: true };
      }
      throw error;
    }
  }

  async listManagedPages(accessToken: string): Promise<
    {
      id: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: { id: string; username?: string };
    }[]
  > {
    const url = `${graphBaseUrl(this.graphVersion)}/me/accounts`;
    const { items } = await paginateCursorPages({
      maxPages: 10,
      fetchPage: async (after) => {
        const response = await this.config.httpClient.request(url, {
          searchParams: {
            access_token: accessToken,
            fields: "id,name,access_token,instagram_business_account{id,username}",
            limit: "100",
            after,
          },
        });
        const body = await response.json<{
          data?: {
            id: string;
            name?: string;
            access_token?: string;
            instagram_business_account?: { id: string; username?: string };
          }[];
          paging?: { cursors?: { after?: string } };
          error?: { message?: string };
        }>();
        if (body.error?.message) throw new Error(body.error.message);
        return {
          data: body.data ?? [],
          nextCursor: body.paging?.cursors?.after,
        };
      },
    });
    return items;
  }

  async createMediaContainer(
    accessToken: string,
    igUserId: string,
    params: Record<string, string>,
  ): Promise<{ id: string }> {
    const url = `${graphBaseUrl(this.graphVersion)}/${igUserId}/media`;
    const response = await this.config.httpClient.request(url, {
      method: "POST",
      searchParams: { access_token: accessToken, ...params },
    });
    const body = await response.json<{ id?: string; error?: { message?: string } }>();
    if (body.error?.message) throw new Error(body.error.message);
    if (!body.id) throw new Error("Graph não retornou creation_id");
    return { id: body.id };
  }

  async getContainerStatus(
    accessToken: string,
    containerId: string,
  ): Promise<{ status_code?: string }> {
    const url = `${graphBaseUrl(this.graphVersion)}/${containerId}`;
    const response = await this.config.httpClient.request(url, {
      searchParams: {
        access_token: accessToken,
        fields: "status_code",
      },
    });
    const body = await response.json<{
      status_code?: string;
      error?: { message?: string };
    }>();
    if (body.error?.message) throw new Error(body.error.message);
    return { status_code: body.status_code };
  }

  async getMediaPermalink(
    accessToken: string,
    mediaId: string,
  ): Promise<string | undefined> {
    const url = `${graphBaseUrl(this.graphVersion)}/${mediaId}`;
    const response = await this.config.httpClient.request(url, {
      searchParams: {
        access_token: accessToken,
        fields: "permalink",
      },
    });
    const body = await response.json<{ permalink?: string; error?: { message?: string } }>();
    if (body.error?.message) return undefined;
    return body.permalink;
  }

  async publishMedia(
    accessToken: string,
    igUserId: string,
    creationId: string,
  ): Promise<{ id: string }> {
    const url = `${graphBaseUrl(this.graphVersion)}/${igUserId}/media_publish`;
    const response = await this.config.httpClient.request(url, {
      method: "POST",
      searchParams: {
        access_token: accessToken,
        creation_id: creationId,
      },
    });
    const body = await response.json<{ id?: string; error?: { message?: string } }>();
    if (body.error?.message) throw new Error(body.error.message);
    if (!body.id) throw new Error("Graph não retornou media id");
    return { id: body.id };
  }

  async listMediaComments(
    accessToken: string,
    mediaId: string,
    maxPages = 5,
  ): Promise<{ items: InstagramCommentV1[]; unsupported: boolean }> {
    const fields = "id,text,timestamp,username,from,hidden,parent_id";
    const url = `${graphBaseUrl(this.graphVersion)}/${mediaId}/comments`;
    try {
      const { items } = await paginateCursorPages({
        maxPages,
        fetchPage: async (after) => {
          const response = await this.config.httpClient.request(url, {
            searchParams: {
              access_token: accessToken,
              fields,
              limit: "50",
              after,
            },
          });
          const body = await response.json<InstagramCommentListResponseV1>();
          if (body.error?.message) throw new Error(body.error.message);
          return {
            data: body.data ?? [],
            nextCursor: body.paging?.cursors?.after,
          };
        },
      });
      return { items, unsupported: false };
    } catch (error) {
      if (isUnsupportedInsightError(error) || isCommentsPermissionError(error)) {
        return { items: [], unsupported: true };
      }
      throw error;
    }
  }

  async listCommentReplies(
    accessToken: string,
    commentId: string,
    maxPages = 3,
  ): Promise<InstagramCommentV1[]> {
    const fields = "id,text,timestamp,username,from,hidden,parent_id";
    const url = `${graphBaseUrl(this.graphVersion)}/${commentId}/replies`;
    const { items } = await paginateCursorPages({
      maxPages,
      fetchPage: async (after) => {
        const response = await this.config.httpClient.request(url, {
          searchParams: {
            access_token: accessToken,
            fields,
            limit: "50",
            after,
          },
        });
        const body = await response.json<InstagramCommentListResponseV1>();
        if (body.error?.message) {
          if (isCommentsPermissionError(body.error.message)) return { data: [] };
          throw new Error(body.error.message);
        }
        return {
          data: (body.data ?? []).map((row) => ({ ...row, parent_id: row.parent_id ?? commentId })),
          nextCursor: body.paging?.cursors?.after,
        };
      },
    });
    return items;
  }

  async replyToComment(
    accessToken: string,
    commentId: string,
    message: string,
  ): Promise<{ id: string }> {
    const url = `${graphBaseUrl(this.graphVersion)}/${commentId}/replies`;
    const response = await this.config.httpClient.request(url, {
      method: "POST",
      searchParams: {
        access_token: accessToken,
        message,
      },
    });
    const body = await response.json<{ id?: string; error?: { message?: string } }>();
    if (body.error?.message) throw new Error(body.error.message);
    if (!body.id) throw new Error("Graph não retornou id da resposta");
    return { id: body.id };
  }

  async sendDirectMessage(
    accessToken: string,
    igUserId: string,
    recipientIgsid: string,
    message: string,
  ): Promise<{ id: string }> {
    const url = `${graphBaseUrl(this.graphVersion)}/${igUserId}/messages`;
    const response = await this.config.httpClient.request(url, {
      method: "POST",
      searchParams: {
        access_token: accessToken,
        recipient: JSON.stringify({ id: recipientIgsid }),
        message: JSON.stringify({ text: message }),
      },
    });
    const body = await response.json<{ message_id?: string; id?: string; error?: { message?: string } }>();
    if (body.error?.message) throw new Error(body.error.message);
    const id = body.message_id ?? body.id;
    if (!id) throw new Error("Graph não retornou id da mensagem");
    return { id };
  }

  async listConversations(
    accessToken: string,
    igUserId: string,
    maxPages = 3,
  ): Promise<{ items: InstagramConversationV1[]; unsupported: boolean }> {
    const url = `${graphBaseUrl(this.graphVersion)}/${igUserId}/conversations`;
    try {
      const { items } = await paginateCursorPages({
        maxPages,
        fetchPage: async (after) => {
          const response = await this.config.httpClient.request(url, {
            searchParams: {
              access_token: accessToken,
              platform: "instagram",
              fields: "id,updated_time,participants",
              limit: "25",
              after,
            },
          });
          const body = await response.json<InstagramConversationListResponseV1>();
          if (body.error?.message) throw new Error(body.error.message);
          return {
            data: body.data ?? [],
            nextCursor: body.paging?.cursors?.after,
          };
        },
      });
      return { items, unsupported: false };
    } catch (error) {
      if (isMessagesPermissionError(error)) {
        return { items: [], unsupported: true };
      }
      throw error;
    }
  }

  async listConversationMessages(
    accessToken: string,
    conversationId: string,
    maxPages = 3,
  ): Promise<InstagramConversationMessageV1[]> {
    const url = `${graphBaseUrl(this.graphVersion)}/${conversationId}/messages`;
    try {
      const { items } = await paginateCursorPages({
        maxPages,
        fetchPage: async (after) => {
          const response = await this.config.httpClient.request(url, {
            searchParams: {
              access_token: accessToken,
              fields: "id,created_time,from,message",
              limit: "40",
              after,
            },
          });
          const body = await response.json<InstagramConversationMessagesResponseV1>();
          if (body.error?.message) throw new Error(body.error.message);
          return {
            data: body.data ?? [],
            nextCursor: body.paging?.cursors?.after,
          };
        },
      });
      return items;
    } catch (error) {
      if (isMessagesPermissionError(error)) return [];
      throw error;
    }
  }
}

function isCommentsPermissionError(error: unknown): boolean {
  const text = typeof error === "string" ? error : error instanceof Error ? error.message : String(error);
  return /(#10)\b|(#200)\b|instagram_manage_comments|permission|not authorized|oauth exception/i.test(
    text,
  );
}

function isMessagesPermissionError(error: unknown): boolean {
  const text = typeof error === "string" ? error : error instanceof Error ? error.message : String(error);
  return /(#10)\b|(#200)\b|instagram_manage_messages|pages_messaging|permission|not authorized|oauth exception/i.test(
    text,
  );
}
