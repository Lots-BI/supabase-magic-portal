import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { periodRange, type OverviewRow } from "@/lib/metrics";
import type { PeriodDays } from "@/components/lots/PeriodToggle";

export type PortfolioClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
  total_registros: number;
};

export type AdminPortfolioPayload = {
  overview: OverviewRow[];
  ativos: PortfolioClienteAtivo[];
  from: string;
  to: string;
  prevFrom: string;
};

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapOverview(row: Record<string, unknown>): OverviewRow {
  return {
    data: String(row.data).slice(0, 10),
    cliente: String(row.cliente),
    meta_spend: asNumber(row.meta_spend),
    google_spend: asNumber(row.google_spend),
    total_impressions: asNumber(row.total_impressions),
    total_clicks: asNumber(row.total_clicks),
    ga4_sessions: asNumber(row.ga4_sessions),
    ga4_conversions: asNumber(row.ga4_conversions),
    instagram_reach: asNumber(row.instagram_reach),
    instagram_interactions: asNumber(row.instagram_interactions),
    meta_results: asNumber(row.meta_results),
    meta_conversions: asNumber(row.meta_conversions),
    google_conversions: asNumber(row.google_conversions),
  };
}

function mapAtivo(row: Record<string, unknown>): PortfolioClienteAtivo {
  return {
    cliente: String(row.cliente),
    ultima_data_recebida: row.ultima_data_recebida != null ? String(row.ultima_data_recebida).slice(0, 10) : null,
    ultima_ingestao: row.ultima_ingestao != null ? String(row.ultima_ingestao) : null,
    plataformas_ativas: Array.isArray(row.plataformas_ativas)
      ? row.plataformas_ativas.map(String)
      : null,
    total_registros: Number(row.total_registros ?? 0),
  };
}

export const getAdminPortfolioFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<AdminPortfolioPayload> => {
    const ok = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email ?? undefined,
      repair: true,
    });
    if (!ok) throw new Error("Forbidden: admin role required");

    const period = periodRange(data.days as PeriodDays);
    const [overviewRes, ativosRes] = await Promise.all([
      context.supabase.rpc("portfolio_overview", {
        p_from: period.prevFrom,
        p_to: period.to,
      }),
      context.supabase.rpc("portfolio_clientes_ativos"),
    ]);

    if (overviewRes.error) throw new Error(overviewRes.error.message);
    if (ativosRes.error) throw new Error(ativosRes.error.message);

    return {
      overview: (overviewRes.data ?? []).map((row) => mapOverview(row as Record<string, unknown>)),
      ativos: (ativosRes.data ?? []).map((row) => mapAtivo(row as Record<string, unknown>)),
      from: period.from,
      to: period.to,
      prevFrom: period.prevFrom,
    };
  });

export const adminPortfolioQuery = (days: PeriodDays) =>
  queryOptions({
    queryKey: ["admin", "portfolio", days] as const,
    queryFn: () => getAdminPortfolioFn({ data: { days } }),
    staleTime: 30_000,
  });
