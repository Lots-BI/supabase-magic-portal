export type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

/** Porta de gravação Hub — replace-by-day (apaga o dia e reinsere). */
export interface BaseMetricasInsertPort {
  writeRows(
    rows: readonly import("@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows").BaseMetricasInsertRowV1[],
  ): Promise<{
    written: number;
  }>;
}
