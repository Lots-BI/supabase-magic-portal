import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";
import type { BaseMetricasInsertPort } from "./ports/base-metricas-insert.port";
import {
  excludeExistingMetricRows,
  type MetricNaturalKeyRow,
} from "./metric-row-natural-key";
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

function isUniqueViolation(message: string): boolean {
  return /duplicate key|unique constraint|uq_base_metricas/i.test(message);
}

async function fetchExistingNaturalKeys(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  rows: readonly BaseMetricasInsertRowV1[],
): Promise<MetricNaturalKeyRow[]> {
  const existing: MetricNaturalKeyRow[] = [];
  const groups = new Map<string, BaseMetricasInsertRowV1[]>();

  for (const row of rows) {
    const groupKey = `${row.cliente}\u0001${row.plataforma}`;
    const group = groups.get(groupKey) ?? [];
    group.push(row);
    groups.set(groupKey, group);
  }

  for (const groupRows of groups.values()) {
    const first = groupRows[0];
    const dates = groupRows.map((row) => row.data);
    const from = dates.reduce((min, date) => (date < min ? date : min));
    const to = dates.reduce((max, date) => (date > max ? date : max));

    const { data, error } = await supabase
      .from(table)
      .select("cliente,plataforma,metrica,data,campanha")
      .eq("cliente", first.cliente)
      .eq("plataforma", first.plataforma)
      .gte("data", from)
      .lte("data", to);
    if (error) {
      throw new Error(`${table} select existing keys failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      existing.push(row as MetricNaturalKeyRow);
    }
  }

  return existing;
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
      for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
        const existing = await fetchExistingNaturalKeys(supabase, table, chunk);
        const missing = excludeExistingMetricRows(chunk, existing);
        if (missing.length === 0) continue;

        const { error } = await supabase.from(table).insert(missing);
        if (error) {
          if (isUniqueViolation(error.message)) {
            const afterRace = await fetchExistingNaturalKeys(supabase, table, missing);
            const stillMissing = excludeExistingMetricRows(missing, afterRace);
            if (stillMissing.length === 0) continue;
            const retry = await supabase.from(table).insert(stillMissing);
            if (retry.error) {
              throw new Error(`${table} insert failed: ${retry.error.message}`);
            }
            inserted += stillMissing.length;
            continue;
          }
          throw new Error(`${table} insert failed: ${error.message}`);
        }
        inserted += missing.length;
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
