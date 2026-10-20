import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { parseRetryAfterMs, RateLimitHttpError } from "../../_internal/http/fetch-http-client";
import { paginateCursorPages } from "../../_internal/http/paginate-cursor";
import type {
  MetaAdsListResponseV1,
  MetaCampaignsResponseV1,
  MetaInsightsResponseV1,
} from "./meta-api.types";

export interface MetaGraphClientConfig {
  httpClient: HttpClientPort;
  graphVersion?: string;
}

export interface FetchCampaignInsightsInput {
  accessToken: string;
  adAccountId: string;
  window: { from: string; to: string };
  maxPages?: number;
}

export interface FetchCampaignInsightsResult {
  insights: MetaInsightsResponseV1["data"];
  pagesFetched: number;
  rateLimitHit: boolean;
}

/** Delivery + `actions` (fallback quando o field oficial `results` falha). */
export const META_INSIGHTS_FIELDS_ACTIONS =
  "campaign_name,campaign_id,impressions,reach,clicks,spend,actions";

/** `conversions` é campo oficial, mas algumas contas/versões recusam o field. */
export const META_INSIGHTS_FIELDS_WITH_CONVERSIONS = `${META_INSIGHTS_FIELDS_ACTIONS},conversions`;

/** Cliques no link / únicos — o Gerenciador usa estes, não o `clicks` genérico. */
export const META_INSIGHTS_FIELDS_FULL = `${META_INSIGHTS_FIELDS_WITH_CONVERSIONS},inline_link_clicks,unique_clicks`;

/** Coluna Resultados do Gerenciador — fields oficiais da Insights API. */
export const META_INSIGHTS_FIELDS_WITH_RESULTS = `${META_INSIGHTS_FIELDS_FULL},results,objective_results`;

/** Coluna Resultados + indicadores do Gerenciador (ThruPlay, saída, perfil). */
export const META_INSIGHTS_FIELDS_CAMPAIGN = `${META_INSIGHTS_FIELDS_WITH_RESULTS},video_thruplay_watched_actions,outbound_clicks,instagram_profile_follow,instagram_profile_visits`;

const META_CAMPAIGN_OPTIONAL_FIELDS = [
  "video_thruplay_watched_actions",
  "outbound_clicks",
  "instagram_profile_follow",
  "instagram_profile_visits",
] as const;

export function shouldRetryInsightsWithoutConversions(error: unknown): boolean {
  if (!(error instanceof HttpClientError)) return false;
  if (error.status !== 400) return false;
  const text = `${error.message}\n${error.body ?? ""}`.toLowerCase();
  return text.includes("conversions");
}

export function shouldRetryInsightsWithoutClickBreakdown(error: unknown): boolean {
  if (!(error instanceof HttpClientError)) return false;
  if (error.status !== 400) return false;
  const text = `${error.message}\n${error.body ?? ""}`.toLowerCase();
  return text.includes("inline_link_clicks") || text.includes("unique_clicks");
}

export const META_AD_INSIGHTS_FIELDS =
  "campaign_name,campaign_id,adset_name,adset_id,ad_name,ad_id,impressions,reach,clicks,spend,inline_link_clicks,actions,results,instagram_profile_follow,instagram_profile_visits,outbound_clicks,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,action_values";

export const META_ADSET_INSIGHTS_FIELDS =
  "campaign_name,campaign_id,adset_name,adset_id,impressions,reach,clicks,spend,inline_link_clicks,actions,results,instagram_profile_follow,instagram_profile_visits,outbound_clicks,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,action_values";

export function insightFieldCited(error: unknown): string | null {
  if (!(error instanceof HttpClientError) || error.status !== 400) return null;
  const text = `${error.message}\n${error.body ?? ""}`;
  const match = text.match(/field \(([^)]+)\)/i);
  return match?.[1]?.trim() || null;
}

export function withoutInsightField(fields: string, field: string): string {
  return fields
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== field)
    .join(",");
}

export function shouldRetryInsightsWithoutOfficialResults(error: unknown): boolean {
  if (!(error instanceof HttpClientError)) return false;
  if (error.status !== 400) return false;
  const text = `${error.message}\n${error.body ?? ""}`.toLowerCase();
  return text.includes("objective_results") || /\bresults\b/.test(text);
}

function normalizeAdAccountId(externalId: string): string {
  const trimmed = externalId.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

function graphBaseUrl(version: string): string {
  return `https://graph.facebook.com/${version}`;
}

function throwMetaHttpError(error: unknown): never {
  if (error instanceof HttpClientError) {
    if (error.status === 401) {
      throw new HttpClientError("Meta authentication failed", 401, error.body);
    }
    if (error.status === 429) {
      throw new RateLimitHttpError(error.message, parseRetryAfterMs({}));
    }
  }
  throw error;
}

/** Cliente Graph API — mockável via HttpClientPort. */
export class MetaGraphClient {
  private readonly graphVersion: string;

  constructor(private readonly config: MetaGraphClientConfig) {
    this.graphVersion = config.graphVersion ?? "v22.0";
  }

  async fetchCampaignInsights(
    input: FetchCampaignInsightsInput,
  ): Promise<FetchCampaignInsightsResult> {
    const accountId = normalizeAdAccountId(input.adAccountId);
    const baseUrl = `${graphBaseUrl(this.graphVersion)}/${accountId}/insights`;
    let rateLimitHit = false;

    let fields = META_INSIGHTS_FIELDS_CAMPAIGN;

    const fetchInsightsPage = async (after?: string) => {
      const response = await this.config.httpClient.request(baseUrl, {
        searchParams: {
          access_token: input.accessToken,
          level: "campaign",
          time_increment: "1",
          fields,
          time_range: JSON.stringify({ since: input.window.from, until: input.window.to }),
          limit: "100",
          after,
        },
      });

      const body = await response.json<MetaInsightsResponseV1>();
      return {
        data: body.data ?? [],
        nextCursor: body.paging?.cursors?.after,
      };
    };

    const { items, pagesFetched } = await paginateCursorPages({
      maxPages: input.maxPages,
      fetchPage: async (after) => {
        try {
          return await fetchInsightsPage(after);
        } catch (error) {
          let current = error;
          if (!after) {
            let cited = insightFieldCited(current);
            while (
              cited &&
              (META_CAMPAIGN_OPTIONAL_FIELDS as readonly string[]).includes(cited) &&
              fields.includes(cited)
            ) {
              fields = withoutInsightField(fields, cited);
              try {
                return await fetchInsightsPage(after);
              } catch (strippedError) {
                current = strippedError;
                cited = insightFieldCited(current);
              }
            }
          }
          if (!after && shouldRetryInsightsWithoutOfficialResults(current)) {
            fields = META_INSIGHTS_FIELDS_FULL;
            try {
              return await fetchInsightsPage(after);
            } catch (withoutResultsError) {
              current = withoutResultsError;
            }
          }
          if (!after && shouldRetryInsightsWithoutClickBreakdown(current)) {
            fields = META_INSIGHTS_FIELDS_WITH_CONVERSIONS;
            try {
              return await fetchInsightsPage(after);
            } catch (clickRetryError) {
              if (shouldRetryInsightsWithoutConversions(clickRetryError)) {
                fields = META_INSIGHTS_FIELDS_ACTIONS;
                try {
                  return await fetchInsightsPage(after);
                } catch (retryError) {
                  if (retryError instanceof RateLimitHttpError) {
                    rateLimitHit = true;
                  }
                  throwMetaHttpError(retryError);
                }
              }
              if (clickRetryError instanceof RateLimitHttpError) {
                rateLimitHit = true;
              }
              throwMetaHttpError(clickRetryError);
            }
          }
          if (!after && shouldRetryInsightsWithoutConversions(current)) {
            fields = META_INSIGHTS_FIELDS_ACTIONS;
            try {
              return await fetchInsightsPage(after);
            } catch (retryError) {
              if (retryError instanceof RateLimitHttpError) {
                rateLimitHit = true;
              }
              throwMetaHttpError(retryError);
            }
          }
          if (current instanceof RateLimitHttpError) {
            rateLimitHit = true;
          }
          throwMetaHttpError(current);
        }
      },
    });

    return { insights: items, pagesFetched, rateLimitHit };
  }

  /** Objetivo e status atuais — a Insights API não manda se a campanha está ativa. */
  async fetchCampaignObjectives(input: {
    accessToken: string;
    adAccountId: string;
    maxPages?: number;
  }): Promise<{ objectives: Map<string, string>; statuses: { name: string; status: string }[] }> {
    const accountId = normalizeAdAccountId(input.adAccountId);
    const baseUrl = `${graphBaseUrl(this.graphVersion)}/${accountId}/campaigns`;
    const objectives = new Map<string, string>();
    const statuses: { name: string; status: string }[] = [];

    const { items } = await paginateCursorPages({
      maxPages: input.maxPages,
      fetchPage: async (after) => {
        try {
          const response = await this.config.httpClient.request(baseUrl, {
            searchParams: {
              access_token: input.accessToken,
              fields: "id,name,objective,effective_status",
              limit: "200",
              after,
            },
          });
          const body = await response.json<MetaCampaignsResponseV1>();
          return {
            data: body.data ?? [],
            nextCursor: body.paging?.cursors?.after,
          };
        } catch (error) {
          throwMetaHttpError(error);
        }
      },
    });

    for (const campaign of items) {
      if (campaign.id && campaign.objective) {
        objectives.set(campaign.id, campaign.objective);
      }
      if (campaign.name && campaign.effective_status) {
        statuses.push({ name: campaign.name, status: campaign.effective_status });
      }
    }
    return { objectives, statuses };
  }

  /**
   * Insights de conjunto ou anúncio. Campo recusado pela conta é removido e
   * a primeira página é tentada de novo — o restante da coleta de campanha
   * não depende desta chamada.
   */
  async fetchLevelInsights(input: {
    accessToken: string;
    adAccountId: string;
    level: "ad" | "adset";
    window: { from: string; to: string };
    maxPages?: number;
  }): Promise<MetaInsightsResponseV1["data"]> {
    const accountId = normalizeAdAccountId(input.adAccountId);
    const baseUrl = `${graphBaseUrl(this.graphVersion)}/${accountId}/insights`;
    let fields = input.level === "ad" ? META_AD_INSIGHTS_FIELDS : META_ADSET_INSIGHTS_FIELDS;

    const fetchPage = async (after?: string) => {
      const response = await this.config.httpClient.request(baseUrl, {
        searchParams: {
          access_token: input.accessToken,
          level: input.level,
          time_increment: "1",
          fields,
          time_range: JSON.stringify({ since: input.window.from, until: input.window.to }),
          limit: "100",
          after,
        },
      });
      const body = await response.json<MetaInsightsResponseV1>();
      return {
        data: body.data ?? [],
        nextCursor: body.paging?.cursors?.after,
      };
    };

    const { items } = await paginateCursorPages({
      maxPages: input.maxPages,
      fetchPage: async (after) => {
        let attempts = 0;
        while (attempts < 12) {
          try {
            return await fetchPage(after);
          } catch (error) {
            const cited = !after ? insightFieldCited(error) : null;
            if (!cited || !fields.split(",").includes(cited)) throwMetaHttpError(error);
            const next = withoutInsightField(fields, cited);
            if (!next || next === fields) throwMetaHttpError(error);
            fields = next;
            attempts += 1;
          }
        }
        throw new Error("Meta insights: campos recusados em sequência");
      },
    });

    return items;
  }

  /** Anúncios cujo criativo aponta para uma publicação que já existia (turbinação). */
  async fetchBoostedAdIds(input: {
    accessToken: string;
    adAccountId: string;
    maxPages?: number;
  }): Promise<Set<string>> {
    const accountId = normalizeAdAccountId(input.adAccountId);
    const baseUrl = `${graphBaseUrl(this.graphVersion)}/${accountId}/ads`;
    const boosted = new Set<string>();

    const { items } = await paginateCursorPages({
      maxPages: input.maxPages ?? 15,
      fetchPage: async (after) => {
        try {
          const response = await this.config.httpClient.request(baseUrl, {
            searchParams: {
              access_token: input.accessToken,
              fields: "id,creative{source_instagram_media_id}",
              limit: "200",
              after,
            },
          });
          const body = await response.json<MetaAdsListResponseV1>();
          return {
            data: body.data ?? [],
            nextCursor: body.paging?.cursors?.after,
          };
        } catch (error) {
          throwMetaHttpError(error);
        }
      },
    });

    for (const ad of items) {
      if (ad.id && ad.creative?.source_instagram_media_id) boosted.add(ad.id);
    }
    return boosted;
  }
}
