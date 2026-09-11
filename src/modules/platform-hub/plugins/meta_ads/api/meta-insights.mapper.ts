import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type {
  MetaActionValueV1,
  MetaInsightRowV1,
  MetaResultStatV1,
} from "./meta-api.types";

const DELIVERY_FIELDS = ["impressions", "reach", "clicks", "spend"] as const;

const ACTION_METRIC_TYPES: Record<string, readonly string[]> = {
  link_clicks: ["link_click"],
  landing_page_views: ["landing_page_view", "omni_landing_page_view"],
  video_views: ["video_view"],
  post_engagements: ["post_engagement"],
  page_engagements: ["page_engagement"],
  messaging_conversations_started: [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
  ],
  messaging_first_replies: ["onsite_conversion.messaging_first_reply"],
};

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

function valueFromResultStat(stat: MetaResultStatV1): number {
  const direct = parseMetricValue(stat.value);
  if (direct !== null) return direct;
  let total = 0;
  for (const nested of stat.values ?? []) {
    const n = parseMetricValue(nested.value);
    if (n !== null) total += n;
  }
  return total;
}

/**
 * Soma o field oficial `results` / `objective_results` da Insights API.
 * Esse é o mesmo recorte da coluna Resultados do Gerenciador.
 */
export function pickOfficialResultsList(
  ...lists: Array<readonly MetaResultStatV1[] | undefined>
): number {
  for (const list of lists) {
    if (!list?.length) continue;
    let total = 0;
    for (const stat of list) total += valueFromResultStat(stat);
    if (total > 0) return total;
  }
  return 0;
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
  const official = pickOfficialResultsList(insight.results, insight.objective_results);
  if (official > 0) return official;

  const byType = actionsByType(insight);
  const normalized = objective.trim().toUpperCase();
  const messaging = firstPositive(byType, MESSAGING_RESULT_ACTION_TYPES);
  const conversionLike = pickConversionLikeResults(insight, byType);

  if (SALES_OBJECTIVES.has(normalized)) {
    return conversionLike;
  }

  if (LEAD_OBJECTIVES.has(normalized)) {
    const leads = firstPositive(byType, LEAD_RESULT_ACTION_TYPES);
    if (leads > 0) return leads;
    if (conversionLike > 0) return conversionLike;
    return messaging;
  }

  // WhatsApp / Messenger: o Gerenciador conta a conversa como Resultado.
  // Sem objective (ou tráfego/engajamento), não descartar a mensagem.
  if (messaging > 0) return messaging;

  if (TRAFFIC_OBJECTIVES.has(normalized)) {
    const traffic = firstPositive(byType, FALLBACK_RESULT_ACTION_TYPES);
    if (traffic > 0) return traffic;
    return conversionLike;
  }

  if (normalized === "OUTCOME_APP_PROMOTION" || normalized === "APP_INSTALLS") {
    const installs = firstPositive(byType, OTHER_PRIMARY_RESULT_ACTION_TYPES);
    if (installs > 0) return installs;
    return conversionLike;
  }

  return conversionLike;
}

function enumerateIsoDays(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    const [y, m, d] = cursor.split("-").map(Number);
    cursor = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  }
  return days;
}

const MESSAGING_ATTRIBUTION_DAYS = 7;

function isoDayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function rowLookupKey(campaign: string, date: string, metricKey: string): string {
  return `${campaign}\0${date}\0${metricKey}`;
}

/**
 * `messaging_conversation_started_7d` credita a mesma conversa em vários dias
 * de anúncio. O Gerenciador no período conta 1; somar o diário infla (Rodrigo:
 * 1 em 09/09 + 1 em 10/09). Por campanha, junta dias a ≤7 de distância e deixa
 * o resultado no dia da 1ª resposta — ou no último dia, se ninguém respondeu.
 */
export function collapseSevenDayMessagingAttribution(rows: MetricRowV1[]): MetricRowV1[] {
  const index = new Map<string, MetricRowV1>();
  const campaigns = new Set<string>();
  for (const row of rows) {
    const campaign = row.campaign ?? "";
    campaigns.add(campaign);
    if (
      row.metricKey === "results" ||
      row.metricKey === "messaging_conversations_started" ||
      row.metricKey === "messaging_first_replies"
    ) {
      index.set(rowLookupKey(campaign, row.date, row.metricKey), row);
    }
  }

  const valueOf = (campaign: string, date: string, metricKey: string): number =>
    index.get(rowLookupKey(campaign, date, metricKey))?.value ?? 0;

  const setValue = (campaign: string, date: string, metricKey: string, value: number) => {
    const row = index.get(rowLookupKey(campaign, date, metricKey));
    if (row) row.value = value;
  };

  for (const campaign of campaigns) {
    const dates = [
      ...new Set(rows.filter((row) => (row.campaign ?? "") === campaign).map((row) => row.date)),
    ].sort();

    const messagingDates = dates.filter((date) => {
      const messaging = valueOf(campaign, date, "messaging_conversations_started");
      const results = valueOf(campaign, date, "results");
      return messaging > 0 && results === messaging;
    });
    if (messagingDates.length < 2) continue;

    const clusters: string[][] = [];
    let current: string[] = [messagingDates[0]];
    for (let i = 1; i < messagingDates.length; i++) {
      const date = messagingDates[i];
      const prev = messagingDates[i - 1];
      if (isoDayNumber(date) - isoDayNumber(prev) <= MESSAGING_ATTRIBUTION_DAYS) {
        current.push(date);
      } else {
        clusters.push(current);
        current = [date];
      }
    }
    clusters.push(current);

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const replyDates = cluster.filter(
        (date) => valueOf(campaign, date, "messaging_first_replies") > 0,
      );
      const keep = new Set(replyDates.length > 0 ? replyDates : [cluster[cluster.length - 1]]);
      for (const date of cluster) {
        if (keep.has(date)) continue;
        setValue(campaign, date, "messaging_conversations_started", 0);
        setValue(campaign, date, "results", 0);
      }
    }
  }

  return rows;
}

/**
 * Dias sem entrega a API omite. Gravamos 0 em results/conversions para o
 * gap-finder não pedir o mesmo intervalo de novo (e o "Puxar métricas" não
 * falhar com "não devolveu campanhas").
 */
export function markerRowsForUncoveredDates(
  window: { from: string; to: string },
  coveredDates: Iterable<string>,
): MetricRowV1[] {
  const covered = new Set(coveredDates);
  const rows: MetricRowV1[] = [];
  for (const date of enumerateIsoDays(window.from, window.to)) {
    if (covered.has(date)) continue;
    rows.push({ metricKey: "results", value: 0, date, campaign: "" });
    rows.push({ metricKey: "conversions", value: 0, date, campaign: "" });
  }
  return rows;
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
    const byType = actionsByType(insight);

    for (const metricKey of DELIVERY_FIELDS) {
      const value = parseMetricValue(insight[metricKey]);
      if (value === null) continue;
      rows.push({ metricKey, value, date, campaign });
    }

    const inlineLink = parseMetricValue(insight.inline_link_clicks);
    rows.push({
      metricKey: "inline_link_clicks",
      value: inlineLink ?? firstPositive(byType, ACTION_METRIC_TYPES.link_clicks),
      date,
      campaign,
    });
    const uniqueClicks = parseMetricValue(insight.unique_clicks);
    if (uniqueClicks !== null) {
      rows.push({
        metricKey: "unique_clicks",
        value: uniqueClicks,
        date,
        campaign,
      });
    }

    for (const [metricKey, types] of Object.entries(ACTION_METRIC_TYPES)) {
      rows.push({
        metricKey,
        value: firstPositive(byType, types),
        date,
        campaign,
      });
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

  return collapseSevenDayMessagingAttribution(rows);
}

export function countDistinctCampaigns(insights: readonly MetaInsightRowV1[]): number {
  const campaigns = new Set<string>();
  for (const row of insights) {
    const key = row.campaign_id ?? row.campaign_name;
    if (key) campaigns.add(key);
  }
  return campaigns.size;
}
