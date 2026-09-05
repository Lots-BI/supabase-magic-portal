// Lots BI · Oportunidades — regras v1 (manual + regra; IA via origem futura).

import type { PeriodAggregates } from "@/lib/platforms/engine";
import { pctDelta } from "@/lib/platforms/engine";
import { PLATFORM_REGISTRY } from "@/lib/platforms/registry";
import type { PlanoOportunidade } from "./types";

type PlatformAgg = Record<string, PeriodAggregates>;

export interface OportunidadeRegra {
  platform_key: string | null;
  insight: string;
  acao_sugerida: string;
}

export function deriveOportunidadesRegra(platformAggs: PlatformAgg): OportunidadeRegra[] {
  const out: OportunidadeRegra[] = [];

  const gAds = platformAggs.google_ads;
  if (gAds) {
    const ctrCur = gAds.currentKpis.ctr;
    const ctrPrev = gAds.previousKpis.ctr;
    if (ctrCur != null && ctrPrev != null && ctrPrev > 0 && ctrCur > ctrPrev * 1.05) {
      out.push({
        platform_key: "google_ads",
        insight: "CTR acima da média do período anterior",
        acao_sugerida: "Escalar investimento",
      });
    }
  }

  const ig = platformAggs.instagram;
  if (ig) {
    const interactionsCur = ig.current.total_interactions ?? ig.current.likes ?? 0;
    const interactionsPrev = ig.previous.total_interactions ?? ig.previous.likes ?? 0;
    const reachCur = ig.current.reach ?? 0;
    const reachPrev = ig.previous.reach ?? 0;
    if (
      interactionsCur > 0 &&
      reachCur > 0 &&
      interactionsCur / reachCur >
        (interactionsPrev > 0 && reachPrev > 0 ? interactionsPrev / reachPrev : 0) * 1.05
    ) {
      out.push({
        platform_key: "instagram",
        insight: "Conteúdo gerando engajamento acima da média",
        acao_sugerida: "Produzir mais conteúdo no formato que performa",
      });
    }
  }

  const ga4 = platformAggs.ga4;
  if (ga4) {
    const convCur = ga4.current.conversions ?? 0;
    const convPrev = ga4.previous.conversions ?? 0;
    const sessionsCur = ga4.current.sessions ?? 0;
    const sessionsPrev = ga4.previous.sessions ?? 0;
    const rateCur = sessionsCur > 0 ? convCur / sessionsCur : 0;
    const ratePrev = sessionsPrev > 0 ? convPrev / sessionsPrev : 0;
    if (ratePrev > 0 && rateCur > ratePrev * 1.05) {
      out.push({
        platform_key: "ga4",
        insight: "Taxa de conversão melhorou",
        acao_sugerida: "Investir em SEO e otimização de landing",
      });
    }
  }

  return out;
}

export function mergeOportunidades(
  persisted: PlanoOportunidade[],
  regras: OportunidadeRegra[],
): { merged: PlanoOportunidade[]; regraOnly: PlanoOportunidade[] } {
  const regraOnly: PlanoOportunidade[] = regras
    .filter(
      (r) =>
        !persisted.some(
          (p) =>
            p.origem === "regra" && p.platform_key === r.platform_key && p.insight === r.insight,
        ),
    )
    .map((r, i) => ({
      id: `regra-${r.platform_key ?? "geral"}-${i}`,
      plano_id: "",
      platform_key: r.platform_key,
      insight: r.insight,
      acao_sugerida: r.acao_sugerida,
      origem: "regra" as const,
      status: "pendente" as const,
      ordem: i,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  return { merged: [...persisted, ...regraOnly], regraOnly };
}

export function platformLabel(key: string | null): string {
  if (!key) return "Geral";
  return PLATFORM_REGISTRY[key]?.label ?? key;
}
