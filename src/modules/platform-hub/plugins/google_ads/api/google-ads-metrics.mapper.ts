import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { GoogleAdsSearchRowV1 } from "./google-ads-api.types";

const METRIC_FIELDS = [
  { key: "impressions", source: "impressions" as const },
  { key: "clicks", source: "clicks" as const },
  { key: "spend", source: "costMicros" as const, micros: true },
] as const;

function parseMetricValue(raw: string | undefined, micros = false): number | null {
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return micros ? value / 1_000_000 : value;
}

/** Converte linhas GAQL → long format compatível com Make / base_metricas. */
export function mapGoogleAdsRowsToMetricRows(rows: readonly GoogleAdsSearchRowV1[]): MetricRowV1[] {
  const metricRows: MetricRowV1[] = [];

  for (const row of rows) {
    const date = row.segments?.date;
    if (!date) continue;
    const campaign = row.campaign?.name ?? row.campaign?.id;

    for (const field of METRIC_FIELDS) {
      const raw = row.metrics?.[field.source];
      const value = parseMetricValue(raw, "micros" in field && field.micros);
      if (value === null) continue;
      metricRows.push({ metricKey: field.key, value, date, campaign });
    }
  }

  return metricRows;
}

export function googleAdsCampaignStatuses(
  rows: readonly GoogleAdsSearchRowV1[],
): { name: string; status: string }[] {
  const byName = new Map<string, string>();
  for (const row of rows) {
    const name = row.campaign?.name;
    const status = row.campaign?.status;
    if (name && status) byName.set(name, status);
  }
  return [...byName.entries()].map(([name, status]) => ({ name, status }));
}

export function countDistinctGoogleAdsCampaigns(rows: readonly GoogleAdsSearchRowV1[]): number {
  const campaigns = new Set<string>();
  for (const row of rows) {
    const key = row.campaign?.id ?? row.campaign?.name;
    if (key) campaigns.add(key);
  }
  return campaigns.size;
}
