import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { Ga4ReportRowV1 } from "./ga4-api.types";

/** Ordem = request do Ga4Client. Nomes = Make (`activeusers`, …). */
const METRIC_MAP = [
  { key: "activeusers", index: 0 },
  { key: "sessions", index: 1 },
  { key: "engagedsessions", index: 2 },
  { key: "screenpageviews", index: 3 },
  { key: "eventcount", index: 4 },
  { key: "conversions", index: 5 },
] as const;

function formatGa4Date(raw: string | undefined): string | null {
  if (!raw || raw.length !== 8) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function parseMetricValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Converte linhas GA4 → long format compatível com Make / base_metricas. */
export function mapGa4RowsToMetricRows(rows: readonly Ga4ReportRowV1[]): MetricRowV1[] {
  const metricRows: MetricRowV1[] = [];

  for (const row of rows) {
    const date = formatGa4Date(row.dimensionValues?.[0]?.value);
    if (!date) continue;

    for (const field of METRIC_MAP) {
      const value = parseMetricValue(row.metricValues?.[field.index]?.value);
      if (value === null) continue;
      metricRows.push({ metricKey: field.key, value, date });
    }
  }

  return metricRows;
}

export function countGa4ReportDays(rows: readonly Ga4ReportRowV1[]): number {
  const days = new Set<string>();
  for (const row of rows) {
    const date = row.dimensionValues?.[0]?.value;
    if (date) days.add(date);
  }
  return days.size;
}
