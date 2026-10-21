import type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

export type MetricNaturalKeyRow = Pick<
  BaseMetricasInsertRowV1,
  "cliente" | "plataforma" | "metrica" | "data" | "campanha" | "cadastro_cliente_id" | "ad_account_id"
>;

/** Espelha unique do Hub: cadastro quando existe, senão nome, mais a conta. */
export function metricRowNaturalKey(row: MetricNaturalKeyRow): string {
  return [
    row.cadastro_cliente_id ?? "",
    row.cliente,
    row.plataforma,
    row.metrica,
    row.data,
    row.campanha ?? "",
    row.ad_account_id ?? "",
  ].join("\u0001");
}

/** Re-coleta deve inserir só chaves novas (ex.: results) sem estourar unique em spend/clicks. */
export function excludeExistingMetricRows<T extends MetricNaturalKeyRow>(
  incoming: readonly T[],
  existing: readonly MetricNaturalKeyRow[],
): T[] {
  const keys = new Set(existing.map(metricRowNaturalKey));
  return incoming.filter((row) => !keys.has(metricRowNaturalKey(row)));
}
