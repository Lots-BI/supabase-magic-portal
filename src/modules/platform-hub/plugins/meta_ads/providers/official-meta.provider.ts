import type { Capability } from "../../../../../../contracts/plugin/capability.v1";
import type { PlatformIdentityV1 } from "../../../../../../contracts/identity/platform-identity.v1";
import type {
  CollectParamsV1,
  ProviderPortV1,
} from "../../../../../../contracts/provider/provider.v1";
import type { MetricsTimeseriesIngestEnvelopeV1 } from "../../../../../../contracts/ingest/ingest-envelope.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { CredentialAccessPort } from "../../_internal/oauth/credential-access.port";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { MetaGraphClient } from "../api/meta-graph-client";
import {
  countDistinctCampaigns,
  mapMetaInsightsToMetricRows,
  markerRowsForUncoveredDates,
} from "../api/meta-insights.mapper";
import { META_OAUTH_CREDENTIAL_KEY } from "../meta-credential-keys";
import {
  createMetaCollectTelemetry,
  type MetaCollectTelemetrySink,
} from "../observability/meta-collect-telemetry";
import type { HubObservabilityPort } from "@/modules/platform-hub/observability/ports";

/** Label gravado em base_metricas.plataforma — paridade com Make. */
export const META_PLATFORM_LABEL = "Meta Ads";

export interface OfficialMetaProviderConfig {
  credentialAccess: CredentialAccessPort;
  httpClient: HttpClientPort;
  graphVersion?: string;
  observability?: HubObservabilityPort;
  telemetrySink?: MetaCollectTelemetrySink;
}

const METRICS_CAPABILITY = "meta:metrics:collect" as Capability;

function resolveAdAccountIdentity(identities: readonly PlatformIdentityV1[]): PlatformIdentityV1 {
  const primary = identities.find((id) => id.identityType === "ad_account" && id.isPrimary);
  if (primary) return primary;

  const fallback = identities.find((id) => id.identityType === "ad_account");
  if (fallback) return fallback;

  throw new Error("Meta collect requires an ad_account identity on the connection");
}

function assertCapability(capability: Capability): void {
  if (capability !== METRICS_CAPABILITY) {
    throw new Error(`Capability not implemented for Meta official_api: ${capability}`);
  }
}

/** Provider oficial Meta — produz IngestEnvelope; nunca escreve banco. */
export function createOfficialMetaProvider(config: OfficialMetaProviderConfig): ProviderPortV1 {
  const graphClient = new MetaGraphClient({
    httpClient: config.httpClient,
    graphVersion: config.graphVersion,
  });
  const telemetry = createMetaCollectTelemetry(config.observability, config.telemetrySink);

  return {
    providerType: "official_api",
    async collect(params: CollectParamsV1): Promise<MetricsTimeseriesIngestEnvelopeV1> {
      assertCapability(params.capability);

      const timer = telemetry.start();
      const yesterday = (() => {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const [y, m, d] = today.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
      })();
      const window = params.window ?? { from: yesterday, to: yesterday };

      try {
        const adAccount = resolveAdAccountIdentity(params.identities);
        const tokenBundle = await config.credentialAccess.retrieveOAuthToken(
          params.connectionId,
          META_OAUTH_CREDENTIAL_KEY,
        );

        if (!tokenBundle?.accessToken) {
          throw new Error("Meta access token not found in CredentialVault");
        }

        const { insights, pagesFetched, rateLimitHit } = await graphClient.fetchCampaignInsights({
          accessToken: tokenBundle.accessToken,
          adAccountId: adAccount.externalId,
          window,
        });

        let campaignObjectives = new Map<string, string>();
        try {
          campaignObjectives = await graphClient.fetchCampaignObjectives({
            accessToken: tokenBundle.accessToken,
            adAccountId: adAccount.externalId,
          });
        } catch {
          // Insights já vieram; sem objective só contamos conversão de negócio.
        }

        const mapped = mapMetaInsightsToMetricRows(insights, { campaignObjectives });
        const coveredDates = insights.map((row) => row.date_start).filter(Boolean);
        const rows = [
          ...mapped,
          ...markerRowsForUncoveredDates(window, coveredDates),
        ];
        timer.finish({
          campaignsCount: countDistinctCampaigns(insights),
          metricsCount: rows.length,
          pagesFetched,
          rateLimitHit,
        });

        return {
          version: "1.0.0",
          connectionId: params.connectionId,
          pluginKey: "meta_ads",
          providerType: "official_api",
          profile: "metrics-timeseries",
          collectedAt: new Date().toISOString(),
          payload: {
            version: METRIC_BATCH_CONTRACT_VERSION,
            connectionId: params.connectionId,
            platformLabel: META_PLATFORM_LABEL,
            canonicalClientName: "",
            window,
            rows,
            source: { pluginKey: "meta_ads", providerType: "official_api" },
          },
        };
      } catch (error) {
        timer.finish({
          campaignsCount: 0,
          metricsCount: 0,
          pagesFetched: 0,
          rateLimitHit: false,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
}
