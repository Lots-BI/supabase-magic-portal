import type { PlatformIdentityV1 } from "../../../../../../contracts/identity/platform-identity.v1";
import type { ProviderPortV1 } from "../../../../../../contracts/provider/provider.v1";
import type { CredentialAccessPort } from "../../_internal/oauth/credential-access.port";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { createOfficialMetricsProvider } from "../../_internal/provider-framework/create-official-metrics-provider";
import { GoogleAdsClient } from "../api/google-ads-client";
import {
  countDistinctGoogleAdsCampaigns,
  googleAdsCampaignStatuses,
  mapGoogleAdsRowsToMetricRows,
} from "../api/google-ads-metrics.mapper";
import { GOOGLE_ADS_OAUTH_CREDENTIAL_KEY } from "../google-ads-credential-keys";

/** Label gravado em base_metricas.plataforma — paridade com Make. */
export const GOOGLE_ADS_PLATFORM_LABEL = "Google Ads";

export interface OfficialGoogleAdsProviderConfig {
  credentialAccess: CredentialAccessPort;
  httpClient: HttpClientPort;
  apiVersion?: string;
  developerToken?: string;
}

function resolveLoginCustomerId(identities: readonly PlatformIdentityV1[]): string | undefined {
  const manager = identities.find((id) => id.identityType === "manager" && id.isPrimary);
  if (manager) return manager.externalId;
  return identities.find((id) => id.identityType === "manager")?.externalId;
}

/** Provider oficial Google Ads — produz IngestEnvelope; nunca escreve banco. */
export function createOfficialGoogleAdsProvider(
  config: OfficialGoogleAdsProviderConfig,
): ProviderPortV1 {
  const client = new GoogleAdsClient({
    httpClient: config.httpClient,
    apiVersion: config.apiVersion,
    developerToken: config.developerToken,
  });

  return createOfficialMetricsProvider({
    pluginKey: "google_ads",
    platformLabel: GOOGLE_ADS_PLATFORM_LABEL,
    capability: "google_ads:metrics:collect",
    primaryIdentityType: "customer",
    credentialAccess: config.credentialAccess,
    credentialKey: GOOGLE_ADS_OAUTH_CREDENTIAL_KEY,
    async collectMetrics({ accessToken, identity, identities, window }) {
      const { rows, pagesFetched, rateLimitHit } = await client.fetchCampaignMetrics({
        accessToken,
        customerId: identity.externalId,
        loginCustomerId: resolveLoginCustomerId(identities),
        window,
      });

      const metricRows = mapGoogleAdsRowsToMetricRows(rows);
      return {
        rows: metricRows,
        campaignsCount: countDistinctGoogleAdsCampaigns(rows),
        metricsCount: metricRows.length,
        pagesFetched,
        rateLimitHit,
        campaignStatuses: googleAdsCampaignStatuses(rows),
      };
    },
  });
}
