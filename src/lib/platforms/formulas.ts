// ============================================================================
// Lots BI · Fórmulas oficiais de marketing.
// Fonte ÚNICA de verdade. Toda KPI derivada (Dashboard Executivo, Visão Geral
// do Cliente, Dashboards de Plataforma, exportações) passa por aqui.
// Recebem TOTAIS já agregados — nunca calcular sobre média de médias.
// ============================================================================

const safeDiv = (a: number, b: number): number =>
  b > 0 && Number.isFinite(a) && Number.isFinite(b) ? a / b : 0;

/** CTR — Click-Through Rate (0–100, em pontos percentuais). */
export const ctr = (impressions: number, clicks: number): number =>
  safeDiv(clicks, impressions) * 100;

/** CPC — Custo por Clique. */
export const cpc = (spend: number, clicks: number): number => safeDiv(spend, clicks);

/** CPM — Custo por Mil Impressões. */
export const cpm = (spend: number, impressions: number): number =>
  safeDiv(spend, impressions) * 1000;

/** CPA — Custo por Aquisição (custo por conversão). */
export const cpa = (spend: number, conversions: number): number => safeDiv(spend, conversions);

/** Conversion Rate (0–100). */
export const convRate = (numerator: number, denominator: number): number =>
  safeDiv(numerator, denominator) * 100;

/** Frequência — média de impressões por pessoa alcançada. */
export const frequency = (impressions: number, reach: number): number =>
  safeDiv(impressions, reach);

/** Engagement Rate (0–100) — interactions / reach. */
export const engagementRate = (interactions: number, reach: number): number =>
  safeDiv(interactions, reach) * 100;

/** Eventos por sessão (GA4). */
export const eventsPerSession = (events: number, sessions: number): number =>
  safeDiv(events, sessions);

/** Visualizações por usuário (GA4). */
export const viewsPerUser = (views: number, users: number): number => safeDiv(views, users);

/** Média diária — total / quantidade de dias do período. */
export const dailyAverage = (total: number, days: number): number => (days > 0 ? total / days : 0);
