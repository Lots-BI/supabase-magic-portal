// ============================================================================
// Gap finder — puro, sem IO. Dado um intervalo [from, to] e o conjunto de
// datas já presentes no banco, calcula quais dias faltam e agrupa em
// intervalos contínuos (para minimizar chamadas ao provider/Graph API).
// ============================================================================

import { addDaysToDateStr } from "@/modules/platform-hub/plugins/instagram_organic/api/date-utils";

export interface DateRange {
  from: string;
  to: string;
}

/** Datas (YYYY-MM-DD) entre `from` e `to` (inclusive) que NÃO estão em `existing`. */
export function listMissingDates(
  from: string,
  to: string,
  existing: ReadonlySet<string>,
): string[] {
  const missing: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    if (!existing.has(cursor)) missing.push(cursor);
    cursor = addDaysToDateStr(cursor, 1);
    guard += 1;
  }
  return missing;
}

/** Agrupa uma lista de datas (qualquer ordem) em intervalos [from,to] contínuos. */
export function groupIntoContiguousRanges(dates: readonly string[]): DateRange[] {
  if (dates.length === 0) return [];

  const sorted = [...dates].sort();
  const ranges: DateRange[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const date = sorted[i];
    if (date === addDaysToDateStr(prev, 1)) {
      prev = date;
      continue;
    }
    ranges.push({ from: start, to: prev });
    start = date;
    prev = date;
  }

  ranges.push({ from: start, to: prev });
  return ranges;
}
