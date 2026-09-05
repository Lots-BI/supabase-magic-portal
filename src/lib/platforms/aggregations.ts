// ============================================================================
// Lots BI · Aggregation strategies.
// Implementação pura das estratégias declaradas em MetricDef.aggregation.
// Recebe valores numéricos JÁ FILTRADOS pelo período + as linhas originais
// (para custom). Ignora null/NaN.
// ============================================================================

import type { AggStrategy, Row } from "./types";
import type { Period } from "@/lib/period";

function clean(values: Array<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export function applyAggregation(
  strategy: AggStrategy,
  rawValues: Array<number | null | undefined>,
  rows: Row[],
  period: Period,
): number {
  const values = clean(rawValues);
  if (values.length === 0) return 0;
  switch (strategy.kind) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "max":
      return Math.max(...values);
    case "min":
      return Math.min(...values);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "first":
      return values[0];
    case "last":
      return values[values.length - 1];
    case "custom":
      return strategy.fn(values, rows, period);
    default:
      return 0;
  }
}
