import type { PlatformDef, Row } from "./types";

/** Métrica gravada no Hub/Make → coluna da view / PlatformDef. */
export const HUB_METRICA_TO_COLUMN: Record<string, string> = {
  activeusers: "active_users",
  engagedsessions: "engaged_sessions",
  screenpageviews: "pageviews",
  eventcount: "event_count",
  total_interactions: "interactions",
};

export type LongMetricRow = {
  data: string;
  cliente: string;
  campanha?: string | null;
  metrica: string;
  valor: number | null;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Pivot long-format (data/campanha/metrica) para o shape das views diárias. */
export function pivotLongMetricRows(def: PlatformDef, long: LongMetricRow[]): Row[] {
  const columns = new Set(def.metrics.map((metric) => metric.column));
  const byKey = new Map<string, Row>();

  for (const item of long) {
    const metrica = String(item.metrica ?? "").toLowerCase();
    const column = HUB_METRICA_TO_COLUMN[metrica] ?? metrica;
    if (!columns.has(column)) continue;

    const day = String(item.data).slice(0, 10);
    const campanha = item.campanha?.trim() ? item.campanha : "";
    const id = def.campaignField ? `${day}\t${campanha}` : day;
    let row = byKey.get(id);
    if (!row) {
      row = { data: day, cliente: item.cliente };
      if (def.campaignField) row[def.campaignField] = campanha;
      byKey.set(id, row);
    }
    row[column] = num(row[column]) + num(item.valor);
  }

  return [...byKey.values()].sort((a, b) => String(a.data).localeCompare(String(b.data)));
}
