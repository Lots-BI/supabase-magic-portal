// ============================================================================
// Lots BI · Platform engine.
// Funções puras que operam sobre uma PlatformDef + linhas + período.
// Nenhum componente React faz cálculo: tudo passa por aqui.
// ============================================================================

import type { PlatformDef, Row } from "./types";
import type { Period } from "@/lib/period";
import { addDaysISO } from "@/lib/period";
import { applyAggregation } from "./aggregations";

/** Colunas mínimas para queries à view da plataforma. */
export function platformViewSelect(def: PlatformDef): string {
  const cols = new Set(["data", "cliente"]);
  if (def.campaignField) cols.add(def.campaignField);
  for (const m of def.metrics) cols.add(m.column);
  return [...cols].join(",");
}

/** Filtra rows pelo período (inclusivo). */
export function rowsInPeriod(rows: Row[], from: string, to: string): Row[] {
  return rows.filter((r) => r.data >= from && r.data <= to);
}

/** Totais por métrica.key, aplicando a estratégia declarada em cada MetricDef. */
export function aggregate(def: PlatformDef, rows: Row[], period: Period): Record<string, number> {
  // Ordena por data para estratégias first/last serem determinísticas.
  const sorted = [...rows].sort((a, b) => (a.data < b.data ? -1 : 1));
  const out: Record<string, number> = {};
  for (const m of def.metrics) {
    const values = sorted.map((r) => r[m.column] as number | null | undefined);
    out[m.key] = applyAggregation(m.aggregation, values, sorted, period);
  }
  return out;
}

/** Executa cada KpiDef.compute sobre os totais já agregados. */
export function deriveKpis(
  def: PlatformDef,
  totals: Record<string, number>,
  period: Period,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of def.kpis) {
    out[k.key] = k.compute(totals, period);
  }
  return out;
}

/** Série diária — uma linha por dia do período, com valor por métrica. */
export interface DailyPoint extends Record<string, number | string> {
  date: string;
}

export function dailySeries(def: PlatformDef, rows: Row[], period: Period): DailyPoint[] {
  const byDate = new Map<string, Record<string, number>>();
  for (const r of rows) {
    if (r.data < period.from || r.data > period.to) continue;
    const acc = byDate.get(r.data) ?? {};
    for (const m of def.metrics) {
      const v = r[m.column];
      if (v == null) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const kind = m.aggregation.kind;
      if (kind === "max") {
        acc[m.key] = Math.max(acc[m.key] ?? Number.NEGATIVE_INFINITY, n);
      } else if (kind === "min") {
        acc[m.key] = Math.min(acc[m.key] ?? Number.POSITIVE_INFINITY, n);
      } else {
        acc[m.key] = (acc[m.key] ?? 0) + n;
      }
    }
    byDate.set(r.data, acc);
  }
  const out: DailyPoint[] = [];
  let cursor = period.from;
  while (cursor <= period.to) {
    const acc = byDate.get(cursor) ?? {};
    const point: DailyPoint = { date: cursor };
    for (const m of def.metrics) point[m.key] = acc[m.key] ?? 0;
    out.push(point);
    cursor = addDaysISO(cursor, 1);
  }
  return out;
}

/** Ranking por campanha — só quando def.campaignField está presente. */
export interface CampaignAggregate {
  campanha: string;
  totals: Record<string, number>;
  kpis: Record<string, number>;
}

export function byCampaign(def: PlatformDef, rows: Row[], period: Period): CampaignAggregate[] {
  if (!def.campaignField) return [];
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.data < period.from || r.data > period.to) continue;
    const name = String(r[def.campaignField] ?? "").trim();
    if (!name) continue;
    const arr = groups.get(name) ?? [];
    arr.push(r);
    groups.set(name, arr);
  }
  return Array.from(groups.entries()).map(([campanha, rs]) => {
    const totals = aggregate(def, rs, period);
    const kpis = deriveKpis(def, totals, period);
    return { campanha, totals, kpis };
  });
}

/** Delta percentual seguro (0–∞), null quando não há base. */
export function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return 100;
  return ((current - previous) / previous) * 100;
}

/** Agregação do período atual + anterior, em uma única chamada. */
export interface PeriodAggregates {
  current: Record<string, number>;
  previous: Record<string, number>;
  currentKpis: Record<string, number>;
  previousKpis: Record<string, number>;
  daily: DailyPoint[];
  campaigns: CampaignAggregate[];
  lastSync: string | null;
}

export function aggregatePeriod(def: PlatformDef, rows: Row[], period: Period): PeriodAggregates {
  const current = aggregate(def, rowsInPeriod(rows, period.from, period.to), period);
  const previous = aggregate(def, rowsInPeriod(rows, period.prevFrom, period.prevTo), {
    ...period,
    from: period.prevFrom,
    to: period.prevTo,
  });
  const currentKpis = deriveKpis(def, current, period);
  const previousKpis = deriveKpis(def, previous, {
    ...period,
    from: period.prevFrom,
    to: period.prevTo,
  });
  const daily = dailySeries(def, rows, period);
  const campaigns = byCampaign(def, rows, period);
  const lastSync = rows.reduce<string | null>(
    (max, r) => (max == null || r.data > max ? r.data : max),
    null,
  );
  return { current, previous, currentKpis, previousKpis, daily, campaigns, lastSync };
}
