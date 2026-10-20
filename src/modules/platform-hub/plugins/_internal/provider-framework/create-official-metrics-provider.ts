import type { Capability, PluginKey } from "../../../../../../contracts/plugin/capability.v1";
import type { PlatformIdentityV1 } from "../../../../../../contracts/identity/platform-identity.v1";
import type {
  CollectParamsV1,
  ProviderPortV1,
} from "../../../../../../contracts/provider/provider.v1";
import type { MetricsTimeseriesIngestEnvelopeV1 } from "../../../../../../contracts/ingest/ingest-envelope.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { CredentialKey } from "../../../../../../contracts/credential/credential-vault.v1";
import type { CredentialAccessPort } from "../oauth/credential-access.port";

export interface OfficialMetricsCollectResult {
  rows: MetricRowV1[];
  campaignsCount?: number;
  metricsCount: number;
  pagesFetched: number;
  rateLimitHit: boolean;
  campaignStatuses?: { name: string; status: string }[];
}

export interface OfficialMetricsTelemetrySink {
  record(stats: OfficialMetricsCollectResult & { durationMs: number; error?: string }): void;
}

export interface OfficialMetricsTelemetry {
  start(): { finish(stats: OfficialMetricsCollectResult & { error?: string }): void };
}

export interface CreateOfficialMetricsProviderConfig {
  pluginKey: PluginKey;
  platformLabel: string;
  capability: Capability;
  primaryIdentityType: string;
  credentialAccess: CredentialAccessPort;
  credentialKey: CredentialKey;
  telemetry?: OfficialMetricsTelemetry;
  resolveIdentity?: (
    identities: readonly PlatformIdentityV1[],
    primaryIdentityType: string,
  ) => PlatformIdentityV1;
  collectMetrics: (input: {
    accessToken: string;
    identity: PlatformIdentityV1;
    identities: readonly PlatformIdentityV1[];
    window: { from: string; to: string };
  }) => Promise<OfficialMetricsCollectResult>;
}

function defaultResolveIdentity(
  identities: readonly PlatformIdentityV1[],
  primaryIdentityType: string,
): PlatformIdentityV1 {
  const primary = identities.find((id) => id.identityType === primaryIdentityType && id.isPrimary);
  if (primary) return primary;

  const fallback = identities.find((id) => id.identityType === primaryIdentityType);
  if (fallback) return fallback;

  throw new Error(`Collect requires a ${primaryIdentityType} identity on the connection`);
}

/** Factory compartilhada — espelha OfficialMetaProvider sem alterar framework existente. */
export function createOfficialMetricsProvider(
  config: CreateOfficialMetricsProviderConfig,
): ProviderPortV1 {
  const resolveIdentity = config.resolveIdentity ?? defaultResolveIdentity;

  return {
    providerType: "official_api",
    async collect(params: CollectParamsV1): Promise<MetricsTimeseriesIngestEnvelopeV1> {
      if (params.capability !== config.capability) {
        throw new Error(
          `Capability not implemented for ${config.pluginKey} official_api: ${params.capability}`,
        );
      }

      const timer = config.telemetry?.start();
      const today = new Date().toISOString().slice(0, 10);
      const window = params.window ?? { from: today, to: today };

      try {
        const identity = resolveIdentity(params.identities, config.primaryIdentityType);
        const tokenBundle = await config.credentialAccess.retrieveOAuthToken(
          params.connectionId,
          config.credentialKey,
        );

        if (!tokenBundle?.accessToken) {
          throw new Error(`${config.platformLabel} access token not found in CredentialVault`);
        }

        const result = await config.collectMetrics({
          accessToken: tokenBundle.accessToken,
          identity,
          identities: params.identities,
          window,
        });

        timer?.finish(result);

        return {
          version: "1.0.0",
          connectionId: params.connectionId,
          pluginKey: config.pluginKey,
          providerType: "official_api",
          profile: "metrics-timeseries",
          collectedAt: new Date().toISOString(),
          campaignStatuses: result.campaignStatuses,
          payload: {
            version: METRIC_BATCH_CONTRACT_VERSION,
            connectionId: params.connectionId,
            platformLabel: config.platformLabel,
            canonicalClientName: "",
            window,
            rows: result.rows,
            source: { pluginKey: config.pluginKey, providerType: "official_api" },
          },
        };
      } catch (error) {
        timer?.finish({
          campaignsCount: 0,
          metricsCount: 0,
          pagesFetched: 0,
          rateLimitHit: false,
          rows: [],
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
}

export function createNoopOfficialMetricsTelemetry(): OfficialMetricsTelemetry {
  return {
    start() {
      return {
        finish() {
          /* noop */
        },
      };
    },
  };
}
