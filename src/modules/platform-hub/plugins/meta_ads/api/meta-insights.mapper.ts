import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { MetaActionValueV1, MetaInsightRowV1 } from "./meta-api.types";

const DELIVERY_FIELDS = ["impressions", "reach", "clicks", "spend"] as const;

/**
 * Resultados "de negócio" — equivalentes à coluna Resultados do Gerenciador
 * para campanhas de venda/lead/mensagem. Landing page e clique ficam de
 * fallback (tráfego), senão uma campanha OUTCOME_SALES com pixel custom
 * seria contada como centenas de page views.
 */
const SALES_RESULT_ACTION_TYPES = [
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
] as const;

const LEAD_RESULT_ACTION_TYPES = [
  "lead",
  "omni_lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "complete_registration",
  "omni_complete_registration",
  "offsite_conversion.fb_pixel_complete_registration",
  "subscribe_total",
  "submit_application",
  "schedule",
  "contact",
] as const;

const MESSAGING_RESULT_ACTION_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "onsite_conversion.total_messaging_connection",
] as const;

const OTHER_PRIMARY_RESULT_ACTION_TYPES = [
  "omni_app_install",
  "app_install",
  "initiate_checkout",
  "omni_initiated_checkout",
  "add_to_cart",
  "omni_add_to_cart",
] as const;

const FALLBACK_RESULT_ACTION_TYPES = [
  "landing_page_view",
  "omni_landing_page_view",
  "link_click",
] as const;

const SALES_OBJECTIVES = new Set([
  "OUTCOME_SALES",
  "CONVERSIONS",
  "PRODUCT_CATALOG_SALES",
]);

const LEAD_OBJECTIVES = new Set(["OUTCOME_LEADS", "LEAD_GENERATION"]);

const TRAFFIC_OBJECTIVES = new Set([
  "OUTCOME_TRAFFIC",
  "LINK_CLICKS",
  "OUTCOME_AWARENESS",
  "REACH",
  "BRAND_AWARENESS",
]);

export interface MapMetaInsightsOptions {
  /** campaign_id → objective da Marketing API (OUTCOME_SALES, …). */
  campaignObjectives?: ReadonlyMap<string, string>;
}

function objectiveOf(insight: MetaInsightRowV1, options?: MapMetaInsightsOptions): string {
  if (!insight.campaign_id || !options?.campaignObjectives) return "";
  return options.campaignObjectives.get(insight.campaign_id) ?? "";
}

function parseMetricValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function sumActionValues(actions: readonly MetaActionValueV1[] | undefined): number {
  let total = 0;
  for (const action of actions ?? []) {
    const value = parseMetricValue(action.value);
    if (value !== null) total += value;
  }
  return total;
}

function actionsByType(insight: MetaInsightRowV1): Map<string, number> {
  const byType = new Map<string, number>();
  for (const action of insight.actions ?? []) {
    const type = action.action_type;
    const value = parseMetricValue(action.value);
    if (!type || value === null) continue;
    byType.set(type, (byType.get(type) ?? 0) + value);
  }
  return byType;
}

function firstPositive(byType: Map<string, number>, types: readonly string[]): number {
  for (const type of types) {
    const value = byType.get(type);
    if (value && value > 0) return value;
  }
  return 0;
}

function isCustomOffsiteConversion(type: string): boolean {
  return (
    type.startsWith("offsite_conversion.custom") ||
    type.startsWith("offsite_conversion.fb_pixel_custom")
  );
}

function sumMatching(byType: Map<string, number>, predicate: (type: string) => boolean): number {
  let total = 0;
  for (const [type, value] of byType) {
    if (predicate(type) && value > 0) total += value;
  }
  return total;
}

/**
 * Conversões: campo oficial da Insights API, ou — quando a Meta deixa `conversions`
 * vazio — soma de compras/leads/eventos custom do pixel (caso Antena / OUTCOME_SALES).
 */
export function pickConversionsValue(insight: MetaInsightRowV1): number {
  const official = sumActionValues(insight.conversions);
  if (official > 0) return official;

  const byType = actionsByType(insight);
  return sumMatching(
    byType,
    (type) =>
      isCustomOffsiteConversion(type) ||
      type === "purchase" ||
      type === "omni_purchase" ||
      type === "offsite_conversion.fb_pixel_purchase" ||
      type === "lead" ||
      type === "omni_lead" ||
      type === "offsite_conversion.fb_pixel_lead" ||
      type === "onsite_conversion.lead_grouped",
  );
}

function pickConversionLikeResults(insight: MetaInsightRowV1, byType: Map<string, number>): number {
  const sales = firstPositive(byType, SALES_RESULT_ACTION_TYPES);
  if (sales > 0) return sales;

  const custom = sumMatching(byType, isCustomOffsiteConversion);
  if (custom > 0) return custom;

  const otherOffsite = sumMatching(
    byType,
    (type) => type.startsWith("offsite_conversion.") && !type.includes("view"),
  );
  if (otherOffsite > 0) return otherOffsite;

  const leads = firstPositive(byType, LEAD_RESULT_ACTION_TYPES);
  if (leads > 0) return leads;

  const officialConversions = sumActionValues(insight.conversions);
  if (officialConversions > 0) return officialConversions;

  return 0;
}

/**
 * Coluna Resultados do Gerenciador: usa o objective da campanha quando a API
 * o expõe. Sem objective, só conta conversão de negócio (nunca LPV/clique) —
 * campanha OUTCOME_SALES sem venda no dia deve ficar 0, não 100+ page views.
 */
export function pickResultsValue(
  insight: MetaInsightRowV1,
  objective = "",
): number {
  const byType = actionsByType(insight);
  const normalized = objective.trim().toUpperCase();

  if (SALES_OBJECTIVES.has(normalized)) {
    return pickConversionLikeResults(insight, byType);
  }

  if (LEAD_OBJECTIVES.has(normalized)) {
    const leads = firstPositive(byType, LEAD_RESULT_ACTION_TYPES);
    if (leads > 0) return leads;
    return pickConversionLikeResults(insight, byType);
  }

  if (normalized === "OUTCOME_ENGAGEMENT" || normalized === "MESSAGES") {
    const messaging = firstPositive(byType, MESSAGING_RESULT_ACTION_TYPES);
    if (messaging > 0) return messaging;
    return pickConversionLikeResults(insight, byType);
  }

  if (TRAFFIC_OBJECTIVES.has(normalized)) {
    const traffic = firstPositive(byType, FALLBACK_RESULT_ACTION_TYPES);
    if (traffic > 0) return traffic;
    return pickConversionLikeResults(insight, byType);
  }

  if (normalized === "OUTCOME_APP_PROMOTION" || normalized === "APP_INSTALLS") {
    const installs = firstPositive(byType, OTHER_PRIMARY_RESULT_ACTION_TYPES);
    if (installs > 0) return installs;
    return pickConversionLikeResults(insight, byType);
  }

  return pickConversionLikeResults(insight, byType);
}

/** Converte linhas Insights (wide) → long format compatível com Make / base_metricas. */
export function mapMetaInsightsToMetricRows(
  insights: readonly MetaInsightRowV1[],
  options?: MapMetaInsightsOptions,
): MetricRowV1[] {
  const rows: MetricRowV1[] = [];

  for (const insight of insights) {
    const date = insight.date_start;
    const campaign = insight.campaign_name ?? insight.campaign_id;

    for (const metricKey of DELIVERY_FIELDS) {
      const value = parseMetricValue(insight[metricKey]);
      if (value === null) continue;
      rows.push({ metricKey, value, date, campaign });
    }

    // Sempre grava (inclusive 0) para o gap-finder saber que o dia já foi coletado
    // com o contrato novo — senão dias antigos sem conversão nunca seriam refeitos.
    rows.push({
      metricKey: "conversions",
      value: pickConversionsValue(insight),
      date,
      campaign,
    });
    rows.push({
      metricKey: "results",
      value: pickResultsValue(insight, objectiveOf(insight, options)),
      date,
      campaign,
    });
  }

  return rows;
}

export function countDistinctCampaigns(insights: readonly MetaInsightRowV1[]): number {
  const campaigns = new Set<string>();
  for (const row of insights) {
    const key = row.campaign_id ?? row.campaign_name;
    if (key) campaigns.add(key);
  }
  return campaigns.size;
}
