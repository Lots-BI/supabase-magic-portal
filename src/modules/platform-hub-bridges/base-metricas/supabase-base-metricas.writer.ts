import type {
  NormalizedMetricBatchV1,
  WriteResultV1,
} from "@/modules/platform-hub/metric-pipeline/metric-batch.types";
import type { MetricWriterPort } from "@/modules/platform-hub/metric-pipeline/writers/metric-writer.port";
import { toBaseMetricasInsertRows } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";
import type { BaseMetricasInsertPort } from "./ports/base-metricas-insert.port";
import { createHubMetricasInsertAdapter } from "./supabase-base-metricas-insert.adapter";
import { isHubWriterEnabled, resolveWriterTarget, type WriterTarget } from "./writer-target.config";

export interface SupabaseBaseMetricasWriterOptions {
  enabled?: boolean;
  writerTarget?: WriterTarget;
  insertPort?: BaseMetricasInsertPort;
}

/** SupabaseWriter — homologação grava em base_metricas_hub; make permanece intocado. */
export class SupabaseBaseMetricasWriter implements MetricWriterPort {
  readonly writerKey = "base_metricas_supabase";

  private readonly insertPort: BaseMetricasInsertPort;
  private readonly writerTarget: WriterTarget;

  constructor(private readonly options: SupabaseBaseMetricasWriterOptions = {}) {
    this.writerTarget = resolveWriterTarget(options.writerTarget);
    this.insertPort =
      options.insertPort ?? createHubMetricasInsertAdapter({ writerTarget: this.writerTarget });
  }

  get enabled(): boolean {
    return this.options.enabled ?? isHubWriterEnabled();
  }

  get target(): WriterTarget {
    return this.writerTarget;
  }

  async write(batch: NormalizedMetricBatchV1): Promise<WriteResultV1> {
    const mappedRows = toBaseMetricasInsertRows(batch);
    const invalidCount = batch.rows.length - mappedRows.length;

    if (!this.enabled) {
      return {
        rowsWritten: 0,
        rowsSkipped: batch.rows.length,
        writerKey: this.writerKey,
      };
    }

    if (mappedRows.length === 0) {
      return {
        rowsWritten: 0,
        rowsSkipped: batch.rows.length,
        writerKey: this.writerKey,
      };
    }

    const { written } = await this.insertPort.writeRows(mappedRows);

    return {
      rowsWritten: written,
      rowsSkipped: invalidCount + (mappedRows.length - written),
      writerKey: `${this.writerKey}:${this.writerTarget.toLowerCase()}`,
    };
  }
}

export function createSupabaseBaseMetricasWriter(
  options: SupabaseBaseMetricasWriterOptions = {},
): SupabaseBaseMetricasWriter {
  return new SupabaseBaseMetricasWriter(options);
}

export function createHomologationHubWriter(): SupabaseBaseMetricasWriter {
  return createSupabaseBaseMetricasWriter({
    enabled: true,
    writerTarget: "HUB",
  });
}
