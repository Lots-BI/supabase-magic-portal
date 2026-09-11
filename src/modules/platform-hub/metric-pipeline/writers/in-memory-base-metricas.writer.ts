import type { NormalizedMetricBatchV1, WriteResultV1 } from "../metric-batch.types";
import type { MetricWriterPort } from "./metric-writer.port";
import type { BaseMetricasRowV1 } from "./map-to-base-metricas-rows";
import { toBaseMetricasRows } from "./map-to-base-metricas-rows";

function replaceDayKey(row: { cliente: string; plataforma: string; data: string }): string {
  return `${row.cliente}\u0001${row.plataforma}\u0001${row.data}`;
}

/** MemoryWriter — simula base_metricas sem Supabase (dev/testes). Replace-by-day. */
export class InMemoryBaseMetricasWriter implements MetricWriterPort {
  readonly writerKey = "base_metricas_memory";

  private readonly rows: BaseMetricasRowV1[] = [];

  async write(batch: NormalizedMetricBatchV1): Promise<WriteResultV1> {
    const mapped = toBaseMetricasRows(batch);
    const rowsSkipped = batch.rows.length - mapped.length;

    const daysToReplace = new Set(mapped.map((row) => replaceDayKey(row)));
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const existing = this.rows[i]!;
      if (daysToReplace.has(replaceDayKey(existing))) {
        this.rows.splice(i, 1);
      }
    }

    for (const row of mapped) {
      this.rows.push({ ...row });
    }

    return { rowsWritten: mapped.length, rowsSkipped, writerKey: this.writerKey };
  }

  snapshot(): readonly BaseMetricasRowV1[] {
    return this.rows.map((row) => ({ ...row }));
  }

  count(): number {
    return this.rows.length;
  }
}

/** @deprecated Use InMemoryBaseMetricasWriter — alias de compatibilidade. */
export const BaseMetricasWriter = InMemoryBaseMetricasWriter;
