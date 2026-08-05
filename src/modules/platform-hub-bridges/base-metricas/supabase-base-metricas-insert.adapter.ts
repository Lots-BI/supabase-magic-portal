import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";
import type { BaseMetricasInsertPort } from "./ports/base-metricas-insert.port";
import {
  assertHubWriterTable,
  METRICAS_TABLE_HUB,
  resolveWriterTables,
  type WriterTarget,
} from "./writer-target.config";

const INSERT_CHUNK_SIZE = 500;

export interface SupabaseBaseMetricasInsertAdapterOptions {
  writerTarget?: WriterTarget;
  /** Override explícito de tabelas (testes). */
  tables?: readonly string[];
}

function naturalKey(row: BaseMetricasInsertRowV1): string {
  return [row.cliente, row.plataforma, row.metrica, row.data, row.campanha ?? ""].join("\u0001");
}

/**
 * Remove linhas Hub com a mesma chave natural antes do insert.
 * Evita somar métricas a cada sync (Make permanece intocado).
 */
async function deleteConflictingHubRows(
  table: string,
  rows: readonly BaseMetricasInsertRowV1[],
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const seen = new Set<string>();

  for (const row of rows) {
    const key = naturalKey(row);
    if (seen.has(key)) continue;
    seen.add(key);

    if (row.campanha == null || row.campanha === "") {
      const base = () =>
        supabase
          .from(table)
          .delete()
          .eq("cliente", row.cliente)
          .eq("plataforma", row.plataforma)
          .eq("metrica", row.metrica)
          .eq("data", row.data);
      const nullDel = await base().is("campanha", null);
      if (nullDel.error) {
        throw new Error(`${table} replace-delete failed: ${nullDel.error.message}`);
      }
      const emptyDel = await base().eq("campanha", "");
      if (emptyDel.error) {
        throw new Error(`${table} replace-delete failed: ${emptyDel.error.message}`);
      }
      continue;
    }

    let query = supabase
      .from(table)
      .delete()
      .eq("cliente", row.cliente)
      .eq("plataforma", row.plataforma)
      .eq("metrica", row.metrica)
      .eq("data", row.data)
      .eq("campanha", row.campanha);

    const { error } = await query;
    if (error) {
      throw new Error(`${table} replace-delete failed: ${error.message}`);
    }
  }
}

/** Adapter Supabase — grava em base_metricas_hub (homologação). Nunca em make. */
export class SupabaseBaseMetricasInsertAdapter implements BaseMetricasInsertPort {
  private readonly tables: readonly string[];

  constructor(private readonly options: SupabaseBaseMetricasInsertAdapterOptions = {}) {
    this.tables = options.tables ?? resolveWriterTables(options.writerTarget ?? "HUB");
  }

  async insertRows(rows: readonly BaseMetricasInsertRowV1[]): Promise<{ inserted: number }> {
    if (rows.length === 0) return { inserted: 0 };

    const supabase = getSupabaseAdmin();
    let inserted = 0;

    for (const table of this.tables) {
      assertHubWriterTable(table);
      await deleteConflictingHubRows(table, rows);

      for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
        const { error } = await supabase.from(table).insert(chunk);
        if (error) {
          throw new Error(`${table} insert failed: ${error.message}`);
        }
        inserted += chunk.length;
      }
    }

    return { inserted };
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
