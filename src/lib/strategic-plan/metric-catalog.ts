// Lots BI · Catálogo de métricas/KPIs para o Plano Estratégico — lê PLATFORM_REGISTRY.

import { PLATFORM_REGISTRY } from "@/lib/platforms/registry";

export interface MetricCatalogEntry {
  platformKey: string;
  platformLabel: string;
  key: string;
  label: string;
  kind: "metric" | "kpi";
  format: string;
  positiveIsGood: boolean;
}

export function listMetricCatalog(): MetricCatalogEntry[] {
  const out: MetricCatalogEntry[] = [];
  for (const def of Object.values(PLATFORM_REGISTRY)) {
    for (const m of def.metrics) {
      out.push({
        platformKey: def.key,
        platformLabel: def.label,
        key: m.key,
        label: m.label,
        kind: "metric",
        format: m.format,
        positiveIsGood: m.positiveIsGood ?? true,
      });
    }
    for (const k of def.kpis) {
      out.push({
        platformKey: def.key,
        platformLabel: def.label,
        key: k.key,
        label: k.label,
        kind: "kpi",
        format: k.format,
        positiveIsGood: k.positiveIsGood,
      });
    }
  }
  return out;
}

export function validateMetricRef(
  platformKey: string,
  metricKey: string | null,
  kpiKey: string | null,
): boolean {
  const def = PLATFORM_REGISTRY[platformKey];
  if (!def) return false;
  if (metricKey && kpiKey) return false;
  if (metricKey) return def.metrics.some((m) => m.key === metricKey);
  if (kpiKey) return def.kpis.some((k) => k.key === kpiKey);
  return false;
}

export function resolveRefLabel(
  platformKey: string,
  metricKey: string | null,
  kpiKey: string | null,
): { platformLabel: string; label: string } | null {
  const def = PLATFORM_REGISTRY[platformKey];
  if (!def) return null;
  if (metricKey) {
    const m = def.metrics.find((x) => x.key === metricKey);
    return m ? { platformLabel: def.label, label: m.label } : null;
  }
  if (kpiKey) {
    const k = def.kpis.find((x) => x.key === kpiKey);
    return k ? { platformLabel: def.label, label: k.label } : null;
  }
  return null;
}
