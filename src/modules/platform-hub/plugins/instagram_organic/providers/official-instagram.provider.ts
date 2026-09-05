import type { Capability } from "../../../../../../contracts/plugin/capability.v1";
import type { PlatformIdentityV1 } from "../../../../../../contracts/identity/platform-identity.v1";
import type {
  CollectParamsV1,
  ProviderPortV1,
} from "../../../../../../contracts/provider/provider.v1";
import type {
  EntityUpsertIngestEnvelopeV1,
  MetricsTimeseriesIngestEnvelopeV1,
} from "../../../../../../contracts/ingest/ingest-envelope.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { CredentialAccessPort } from "../../_internal/oauth/credential-access.port";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { IG_MEDIA_SYNC_PAYLOAD_KEY, type IgMediaSyncItemV1 } from "@/modules/instagram-posts/types";
import { InstagramGraphClient } from "../api/instagram-graph-client";
import { mapInsightsToMetrics, mediaPublishedAt } from "../api/instagram-insights.mapper";
import { mapAccountInsightsDayToMetricRows } from "../api/instagram-account-insights.mapper";
import { enumerateDatesInclusive, todayInSaoPaulo } from "../api/date-utils";
import { INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY } from "../instagram-credential-keys";
import {
  INSTAGRAM_ORGANIC_METRICS_CAPABILITY,
  INSTAGRAM_ORGANIC_PROFILE_CAPABILITY,
} from "../instagram_organic.capabilities";

const METRICS_CAPABILITY = INSTAGRAM_ORGANIC_METRICS_CAPABILITY as Capability;
const PROFILE_CAPABILITY = INSTAGRAM_ORGANIC_PROFILE_CAPABILITY as Capability;

export interface OfficialInstagramProviderConfig {
  credentialAccess: CredentialAccessPort;
  httpClient: HttpClientPort;
  graphVersion?: string;
}

function resolveInstagramIdentity(identities: readonly PlatformIdentityV1[]): PlatformIdentityV1 {
  const primary = identities.find((id) => id.identityType === "instagram" && id.isPrimary);
  if (primary) return primary;
  const fallback = identities.find((id) => id.identityType === "instagram");
  if (fallback) return fallback;
  throw new Error("Instagram collect requires an instagram identity on the connection");
}

export function createOfficialInstagramProvider(
  config: OfficialInstagramProviderConfig,
): ProviderPortV1 {
  const graphClient = new InstagramGraphClient({
    httpClient: config.httpClient,
    graphVersion: config.graphVersion,
  });

  async function collectProfileInsights(
    params: CollectParamsV1,
  ): Promise<MetricsTimeseriesIngestEnvelopeV1> {
    const identity = resolveInstagramIdentity(params.identities);
    const tokenBundle = await config.credentialAccess.retrieveOAuthToken(
      params.connectionId,
      INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
    );
    if (!tokenBundle?.accessToken) {
      throw new Error("Instagram access token not found in CredentialVault");
    }

    const accessToken = tokenBundle.accessToken;
    const igUserId = identity.externalId;
    const today = todayInSaoPaulo();
    const window = params.window ?? { from: today, to: today };
    const dates = enumerateDatesInclusive(window.from, window.to);

    const rows: MetricRowV1[] = [];
    for (const date of dates) {
      try {
        const response = await graphClient.fetchAccountInsightsForDay(accessToken, igUserId, date);
        rows.push(...mapAccountInsightsDayToMetricRows(response, date));
      } catch {
        // Dia pontualmente indisponível — segue para o próximo; o gap
        // finder do sync server tentará novamente em uma próxima execução.
      }
    }

    return {
      version: "1.0.0",
      connectionId: params.connectionId,
      pluginKey: "instagram_organic",
      providerType: "official_api",
      profile: "metrics-timeseries",
      collectedAt: new Date().toISOString(),
      payload: {
        version: METRIC_BATCH_CONTRACT_VERSION,
        connectionId: params.connectionId,
        platformLabel: "Instagram",
        canonicalClientName: "",
        window,
        rows,
        source: { pluginKey: "instagram_organic", providerType: "official_api" },
      },
    };
  }

  return {
    providerType: "official_api",
    async collect(
      params: CollectParamsV1,
    ): Promise<EntityUpsertIngestEnvelopeV1 | MetricsTimeseriesIngestEnvelopeV1> {
      if (params.capability === PROFILE_CAPABILITY) {
        return collectProfileInsights(params);
      }

      if (params.capability !== METRICS_CAPABILITY) {
        throw new Error(`Capability not implemented: ${params.capability}`);
      }

      const identity = resolveInstagramIdentity(params.identities);
      const tokenBundle = await config.credentialAccess.retrieveOAuthToken(
        params.connectionId,
        INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
      );
      if (!tokenBundle?.accessToken) {
        throw new Error("Instagram access token not found in CredentialVault");
      }

      const accessToken = tokenBundle.accessToken;
      const igUserId = identity.externalId;
      const collectedAt = new Date().toISOString();

      const permanentMedia = await graphClient.listMedia(accessToken, igUserId);
      let stories: Awaited<ReturnType<InstagramGraphClient["listStories"]>> = [];
      try {
        stories = await graphClient.listStories(accessToken, igUserId);
      } catch {
        stories = [];
      }

      const allMedia = [...permanentMedia, ...stories];
      const items: IgMediaSyncItemV1[] = [];

      for (const media of allMedia) {
        if (!media.id) continue;
        const productType = (media.media_product_type ?? "FEED").toUpperCase();

        let metrics = mapInsightsToMetrics({ data: [] }, media);
        try {
          const insights = await graphClient.fetchMediaInsights(accessToken, media.id, productType);
          metrics = mapInsightsToMetrics(insights, media);
        } catch {
          metrics = mapInsightsToMetrics({ data: [] }, media);
        }

        items.push({
          igMediaId: media.id,
          mediaProductType: productType,
          mediaType: (media.media_type ?? "IMAGE").toUpperCase(),
          caption: media.caption,
          permalink: media.permalink,
          mediaUrl: media.media_url,
          thumbnailUrl: media.thumbnail_url,
          publishedAt: mediaPublishedAt(media),
          metrics,
          metricsCollectedAt: collectedAt,
        });
      }

      return {
        version: "1.0.0",
        connectionId: params.connectionId,
        pluginKey: "instagram_organic",
        providerType: "official_api",
        profile: "entity-upsert",
        collectedAt,
        payload: {
          [IG_MEDIA_SYNC_PAYLOAD_KEY]: {
            cadastroClienteId: 0,
            items,
          },
        },
      };
    },
  };
}
