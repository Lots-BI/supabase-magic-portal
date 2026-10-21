/**
 * @contract MetricBatch (profile metrics-timeseries) v1.0.0
 * @see contracts/ingest/profiles/contract.meta.json
 *
 * Perfil de ingestão para séries temporais. Compatível com base_metricas (long format)
 * após normalização pelo MetricPipeline → BaseMetricasWriter.
 */

import type { ConnectionId } from "../../connection/connection-id.v1";
import type { PluginKey } from "../../plugin/capability.v1";
import type { ProviderType } from "../ingest-envelope.v1";

export const METRIC_BATCH_CONTRACT_VERSION = "1.0.0" as const;

export interface MetricRowV1 {
  /** Chave da métrica (ex.: impressions, spend). */
  metricKey: string;
  value: number;
  /** Data no formato YYYY-MM-DD (timezone America/Sao_Paulo na escrita). */
  date: string;
  campaign?: string;
  /** Conta de anúncios Meta (`act_…`). Isola duas contas do mesmo cliente. */
  adAccountId?: string;
}

export interface MetricBatchV1 {
  readonly version: typeof METRIC_BATCH_CONTRACT_VERSION;
  connectionId: ConnectionId;
  /** Label de plataforma gravado em base_metricas.plataforma. */
  platformLabel: string;
  /** Nome canônico do cliente (resolvido pelo ConnectionResolver). */
  canonicalClientName: string;
  /** Cadastro do cliente. Isola métricas quando o nome se repete entre organizações. */
  cadastroClienteId?: number | null;
  window: {
    from: string;
    to: string;
  };
  rows: MetricRowV1[];
  source: {
    pluginKey: PluginKey;
    providerType: ProviderType;
    syncRunId?: string;
  };
}

/** Batch após normalização — pronto para MetricWriterPort. */
export interface NormalizedMetricBatchV1 extends MetricBatchV1 {
  normalizedAt: string;
}

export interface WriteResultV1 {
  rowsWritten: number;
  rowsSkipped: number;
  writerKey: string;
}
