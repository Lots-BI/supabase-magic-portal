import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";
import type { BaseMetricasInsertPort } from "./ports/base-metricas-insert.port";
import { groupRowsForReplaceDays } from "./group-rows-for-replace-days";
import {
  assertHubWriterTable,
  METRICAS_TABLE_HUB,
  resolveWriterTables,
  type WriterTarget,
} from "./writer-target.config";

export interface SupabaseBaseMetricasInsertAdapterOptions {
  writerTarget?: WriterTarget;
  /** Override explícito de tabelas (testes). */
  tables?: readonly string[];
}

/** Adapter Supabase — replace-by-day em base_metricas_hub. Nunca em make. */
export class SupabaseBaseMetricasInsertAdapter implements BaseMetricasInsertPort {
  private readonly tables: readonly string[];

  constructor(private readonly options: SupabaseBaseMetricasInsertAdapterOptions = {}) {
    this.tables = options.tables ?? resolveWriterTables(options.writerTarget ?? "HUB");
  }

  async writeRows(rows: readonly BaseMetricasInsertRowV1[]): Promise<{ written: number }> {
    if (rows.length === 0) return { written: 0 };

    const supabase = getSupabaseAdmin();
    let written = 0;

    const groups = groupRowsForReplaceDays(rows);

    for (const table of this.tables) {
      assertHubWriterTable(table);
      for (const group of groups) {
        // Uma RPC por data: o dia inteiro some e volta atômico (campanha morta não fica).
        for (const date of group.dates) {
          const dateRows = group.rows.filter((row) => row.data === date);
          if (dateRows.length === 0) continue;
          const { data, error } = await supabase.rpc("replace_hub_metric_days", {
            p_cliente: group.cliente,
            p_plataforma: group.plataforma,
            p_dates: [date],
            p_rows: dateRows,
          });
          if (error) {
            throw new Error(`${table} replace days failed: ${error.message}`);
          }
          written += typeof data === "number" ? data : dateRows.length;
        }
      }
    }

    return { written };
  }
}

export function createHubMetricasInsertAdapter(
  options?: SupabaseBaseMetricasInsertAdapterOptions,
): SupabaseBaseMetricasInsertAdapter {
  return new SupabaseBaseMetricasInsertAdapter({
    writerTarget: "HUB",
    tables: [METRICAS_TABLE_HUB],
    ...options,
  });
}
