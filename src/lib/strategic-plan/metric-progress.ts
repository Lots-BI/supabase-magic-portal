// Lots BI · Progresso de KPIs por referência — usa engine, sem duplicar métricas.

import type { Row } from "@/lib/platforms/types";
import { aggregatePeriod, pctDelta } from "@/lib/platforms/engine";
import { getPlatformDef } from "@/lib/platforms/registry";
import type { Period } from "@/lib/period";
import { resolveRefLabel } from "./metric-catalog";
import type { MetricRefProgress, PlanoMetricRef } from "./types";

export function computeMetricProgress(
  refs: PlanoMetricRef[],
  rowsByPlatform: Record<string, Row[]>,
  period: Period,
): MetricRefProgress[] {
  return refs.map((ref) => {
    const labels = resolveRefLabel(ref.platform_key, ref.metric_key, ref.kpi_key);
    const def = getPlatformDef(ref.platform_key);
    if (!def) {
      return {
        ref,
        label: labels?.label ?? ref.metric_key ?? ref.kpi_key ?? "—",
        platformLabel: labels?.platformLabel ?? ref.platform_key,
        current: null,
        meta: ref.meta_numerica,
        pct: null,
        delta: null,
        onTrack: true,
      };
    }

    const rows = rowsByPlatform[ref.platform_key] ?? [];
    const agg = aggregatePeriod(def, rows, period);
    const key = ref.metric_key ?? ref.kpi_key ?? "";
    const isKpi = !!ref.kpi_key;
    const current = isKpi ? agg.currentKpis[key] : agg.current[key];
    const previous = isKpi ? agg.previousKpis[key] : agg.previous[key];
    const meta = ref.meta_numerica != null ? Number(ref.meta_numerica) : null;
    const cur = current != null && Number.isFinite(current) ? current : null;
    const pct = meta != null && cur != null && meta > 0 ? (cur / meta) * 100 : null;
    const delta = cur != null && previous != null ? pctDelta(cur, previous) : null;
    const positive = ref.positive_is_good;
    const onTrack = meta == null || cur == null || (positive ? cur >= meta : cur <= meta);

    return {
      ref,
      label: labels?.label ?? key,
      platformLabel: labels?.platformLabel ?? def.label,
      current: cur,
      meta,
      pct,
      delta,
      onTrack,
    };
  });
}

export function objectiveProgressPct(
  progressList: MetricRefProgress[],
  manual: number | null,
): number | null {
  if (progressList.length === 0) return manual;
  const withPct = progressList.filter((p) => p.pct != null);
  if (withPct.length === 0) return manual;
  const avg = withPct.reduce((s, p) => s + (p.pct ?? 0), 0) / withPct.length;
  return Math.round(Math.min(100, avg));
}
