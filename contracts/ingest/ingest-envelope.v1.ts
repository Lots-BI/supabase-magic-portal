/**
 * @contract IngestEnvelope v1.0.0
 * @see contracts/ingest/contract.meta.json
 */

import type { ConnectionId } from "../connection/connection-id.v1";
import type { PluginKey } from "../plugin/capability.v1";
import type { MetricBatchV1 } from "./profiles/metrics-timeseries.v1";

export const INGEST_ENVELOPE_CONTRACT_VERSION = "1.0.0" as const;

/** Perfis de ingestão. Apenas metrics-timeseries é implementado na v3.3. */
export type IngestProfileV1 = "metrics-timeseries" | "entity-upsert" | "event-log";

export type ProviderType = "official_api" | "make_passive" | "webhook" | "csv";

export interface IngestEnvelopeBaseV1 {
  readonly version: typeof INGEST_ENVELOPE_CONTRACT_VERSION;
  connectionId: ConnectionId;
  pluginKey: PluginKey;
  providerType: ProviderType;
  collectedAt: string;
  correlationId?: string;
}

export interface CampaignStatusV1 {
  name: string;
  status: string;
}

export interface MetricsTimeseriesIngestEnvelopeV1 extends IngestEnvelopeBaseV1 {
  profile: "metrics-timeseries";
  payload: MetricBatchV1;
  /** Estado atual no gerenciador (ACTIVE, PAUSED…). Não entra na série diária. */
  campaignStatuses?: CampaignStatusV1[];
}

/** Perfis reservados — contrato declarado; implementação futura via ADR. */
export interface EntityUpsertIngestEnvelopeV1 extends IngestEnvelopeBaseV1 {
  profile: "entity-upsert";
  payload: Record<string, unknown>;
}

export interface EventLogIngestEnvelopeV1 extends IngestEnvelopeBaseV1 {
  profile: "event-log";
  payload: Record<string, unknown>;
}

export type IngestEnvelopeV1 =
  | MetricsTimeseriesIngestEnvelopeV1
  | EntityUpsertIngestEnvelopeV1
  | EventLogIngestEnvelopeV1;

export function isMetricsTimeseriesEnvelope(
  envelope: IngestEnvelopeV1,
): envelope is MetricsTimeseriesIngestEnvelopeV1 {
  return envelope.profile === "metrics-timeseries";
}
