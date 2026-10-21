import type { NormalizedMetricBatchV1 } from "../metric-batch.types";

/** Linha long-format compatível com base_metricas. */
export interface BaseMetricasRowV1 {
  cliente: string;
  plataforma: string;
  metrica: string;
  valor: number;
  data: string;
  campanha?: string;
  adAccountId?: string;
}

/** Payload de insert — colunas graváveis (sem id/created_at). */
export interface BaseMetricasInsertRowV1 {
  data: string;
  cliente: string;
  plataforma: string;
  metrica: string;
  valor: number;
  campanha?: string | null;
  cadastro_cliente_id?: number | null;
  ad_account_id?: string | null;
}

/**
 * Google Ads spend é armazenado em micros em base_metricas (legado Make).
 * Meta Ads spend permanece em moeda — ver vw_metricas_normalizadas.
 */
export function toBaseMetricasStorageValue(
  platformLabel: string,
  metricKey: string,
  normalizedValue: number,
): number {
  if (metricKey === "spend" && platformLabel.toLowerCase() === "google ads") {
    return Math.round(normalizedValue * 1_000_000);
  }
  return normalizedValue;
}

export function toBaseMetricasRows(batch: NormalizedMetricBatchV1): BaseMetricasRowV1[] {
  const rows: BaseMetricasRowV1[] = [];

  for (const row of batch.rows) {
    if (!batch.canonicalClientName || !row.metricKey || !row.date) continue;

    rows.push({
      cliente: batch.canonicalClientName,
      plataforma: batch.platformLabel,
      metrica: row.metricKey,
      valor: toBaseMetricasStorageValue(batch.platformLabel, row.metricKey, row.value),
      data: row.date,
      campanha: row.campaign,
      adAccountId: row.adAccountId,
    });
  }

  return rows;
}

export function toBaseMetricasInsertRows(
  batch: NormalizedMetricBatchV1,
): BaseMetricasInsertRowV1[] {
  const cadastroId = batch.cadastroClienteId ?? null;
  return toBaseMetricasRows(batch).map((row) => ({
    data: row.data,
    cliente: row.cliente,
    plataforma: row.plataforma,
    metrica: row.metrica,
    valor: row.valor,
    campanha: row.campanha ?? null,
    cadastro_cliente_id: cadastroId,
    ad_account_id: row.adAccountId?.trim() || null,
  }));
}
