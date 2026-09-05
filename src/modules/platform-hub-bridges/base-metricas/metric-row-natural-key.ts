import type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

export type MetricNaturalKeyRow = Pick<
  BaseMetricasInsertRowV1,
  "cliente" | "plataforma" | "metrica" | "data" | "campanha"
>;

/** Espelha uq_base_metricas_hub_natural_key (COALESCE(campanha, '')). */
export function metricRowNaturalKey(row: MetricNaturalKeyRow): string {
  return [row.cliente, row.plataforma, row.metrica, row.data, row.campanha ?? ""].join("\u0001");
}

/** Re-coleta deve inserir só chaves novas (ex.: results) sem estourar unique em spend/clicks. */
export function excludeExistingMetricRows<T extends MetricNaturalKeyRow>(
  incoming: readonly T[],
  existing: readonly MetricNaturalKeyRow[],
): T[] {
  const keys = new Set(existing.map(metricRowNaturalKey));
  return incoming.filter((row) => !keys.has(metricRowNaturalKey(row)));
}
