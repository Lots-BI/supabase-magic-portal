import type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

export type HubReplaceDayGroup = {
  cliente: string;
  plataforma: string;
  dates: string[];
  rows: BaseMetricasInsertRowV1[];
};

function naturalKey(row: BaseMetricasInsertRowV1): string {
  return `${row.cadastro_cliente_id ?? ""}\u0001${row.cliente}\u0001${row.plataforma}\u0001${row.metrica}\u0001${row.data}\u0001${row.campanha ?? ""}\u0001${row.ad_account_id ?? ""}`;
}

/** Última linha ganha — evita unique violation na RPC depois do DELETE do dia. */
export function dedupeHubMetricRows(
  rows: readonly BaseMetricasInsertRowV1[],
): BaseMetricasInsertRowV1[] {
  const map = new Map<string, BaseMetricasInsertRowV1>();
  for (const row of rows) {
    map.set(naturalKey(row), row);
  }
  return [...map.values()];
}

/** Agrupa o envelope por cliente+plataforma para a RPC replace-by-day. */
export function groupRowsForReplaceDays(
  rows: readonly BaseMetricasInsertRowV1[],
): HubReplaceDayGroup[] {
  const groups = new Map<string, BaseMetricasInsertRowV1[]>();

  for (const row of dedupeHubMetricRows(rows)) {
    const key = `${row.cadastro_cliente_id ?? ""}\u0001${row.cliente}\u0001${row.plataforma}\u0001${row.ad_account_id ?? ""}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.values()].map((groupRows) => {
    const first = groupRows[0]!;
    const dates = [...new Set(groupRows.map((row) => row.data))].sort();
    return {
      cliente: first.cliente,
      plataforma: first.plataforma,
      dates,
      rows: groupRows,
    };
  });
}

export function replaceDayKey(row: { cliente: string; plataforma: string; data: string }): string {
  return `${row.cliente}\u0001${row.plataforma}\u0001${row.data}`;
}
