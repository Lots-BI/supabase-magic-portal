// Lots BI · Motor de narrativa — Diagnóstico Atual (regras v1, interface estável para IA).

import type { PeriodAggregates } from "@/lib/platforms/engine";
import { pctDelta } from "@/lib/platforms/engine";
import { PLATFORM_REGISTRY } from "@/lib/platforms/registry";
import type { DiagnosticoInsight } from "./types";
import { DIAGNOSTICO_THRESHOLDS as T } from "./dashboard-def";

type PlatformAgg = Record<string, PeriodAggregates>;

function delta(agg: PeriodAggregates, key: string, kpi = false): number | null {
  const cur = kpi ? agg.currentKpis[key] : agg.current[key];
  const prev = kpi ? agg.previousKpis[key] : agg.previous[key];
  if (cur == null || prev == null) return null;
  return pctDelta(cur, prev);
}

function push(
  out: DiagnosticoInsight[],
  platform: string,
  narrative: string,
  direction: DiagnosticoInsight["direction"],
  severity: DiagnosticoInsight["severity"],
) {
  const def = PLATFORM_REGISTRY[platform];
  out.push({
    platform,
    platformLabel: def?.label ?? platform,
    narrative,
    direction,
    severity,
  });
}

export function buildDiagnostico(platformAggs: PlatformAgg): DiagnosticoInsight[] {
  const out: DiagnosticoInsight[] = [];

  const gAds = platformAggs.google_ads;
  if (gAds) {
    const spendD = delta(gAds, "spend");
    if (spendD != null && spendD > T.spendUp) {
      push(out, "google_ads", "Investimento aumentando", "up", "info");
    }
    const ctrD = delta(gAds, "ctr", true);
    if (ctrD != null && ctrD < T.ctrDown) {
      push(out, "google_ads", "CTR caindo", "down", "warning");
    }
    const convCur = gAds.current.conversions ?? 0;
    const convPrev = gAds.previous.conversions ?? 0;
    const convD = pctDelta(convCur, convPrev);
    if (convD != null && Math.abs(convD) <= T.conversionsStable) {
      push(out, "google_ads", "Conversões estáveis", "stable", "success");
    }
  }

  const meta = platformAggs.meta_ads;
  if (meta) {
    const cpaCur = meta.currentKpis.cpa;
    const cpaPrev = meta.previousKpis.cpa;
    if (
      cpaCur != null &&
      cpaPrev != null &&
      cpaPrev > 0 &&
      cpaCur > cpaPrev * (1 + T.cpaOverMetaPct / 100)
    ) {
      push(out, "meta_ads", "Meta Ads acima do CPA esperado", "down", "warning");
    }
    const reachD = delta(meta, "reach");
    if (reachD != null && reachD > T.reachUp) {
      push(out, "meta_ads", "Reach crescendo", "up", "success");
    }
  }

  const ig = platformAggs.instagram;
  if (ig) {
    const engD = delta(ig, "engagement_rate", true);
    if (engD != null && engD < T.engagementDown) {
      push(out, "instagram", "Instagram perdendo engajamento", "down", "warning");
    }
    const reachD = delta(ig, "reach");
    if (reachD != null && reachD > T.reachUp) {
      push(out, "instagram", "Reach crescendo", "up", "success");
    }
  }

  const ga4 = platformAggs.ga4;
  if (ga4) {
    const sessionsD = delta(ga4, "sessions");
    if (sessionsD != null && sessionsD > T.reachUp) {
      push(out, "ga4", "Sessões em crescimento", "up", "success");
    }
  }

  return out;
}
