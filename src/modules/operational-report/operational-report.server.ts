import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { assertClientPortalAccess } from "@/modules/approval/internal/client-access.server";
import { resolvePeriod, type PeriodInput, type PeriodPreset } from "@/lib/period";
import { OVERVIEW_CLIENTE_SELECT, sumOverview, type OverviewRow } from "@/lib/metrics";
import { PLATFORMS } from "@/lib/platforms/registry";
import { fetchDashboardRows } from "@/lib/platforms/fetch-dashboard-rows";
import type { Row } from "@/lib/platforms/engine";
import {
  buildOperationalReport,
  type ReportCardRow,
  type ReportMediaRow,
} from "./build-operational-report";
import type { OperationalReport } from "./types";

const PRESETS: PeriodPreset[] = [
  "today",
  "yesterday",
  "last_7",
  "last_30",
  "last_90",
  "this_month",
  "last_month",
  "custom",
];

const inputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
  preset: z.enum(PRESETS as [PeriodPreset, ...PeriodPreset[]]),
  customFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  customTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

async function assertClienteAccess(
  context: {
    supabase: SupabaseClient;
    userId: string;
    claims?: { email?: string | null };
  },
  cadastroClienteId: number,
): Promise<void> {
  const isAdmin = await resolveIsAdmin({
    supabase: context.supabase,
    userId: context.userId,
    email: context.claims?.email ?? undefined,
    repair: true,
  });
  if (isAdmin) return;
  const scope = await assertClientPortalAccess(context);
  if (!scope.cadastroClienteIds.includes(cadastroClienteId)) {
    throw new Error("Sem permissão para este cliente");
  }
}

async function fetchPlatformRows(
  supabase: SupabaseClient,
  clienteNome: string,
  prevFrom: string,
  to: string,
): Promise<Record<string, Row[]>> {
  const entries = await Promise.all(
    PLATFORMS.map(async (def) => {
      try {
        const rows = await fetchDashboardRows(supabase, def, clienteNome, prevFrom, to);
        return [def.key, rows] as const;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[relatorio] ${def.key}:`, message);
        return [def.key, [] as Row[]] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

function mapOverviewRow(row: Record<string, unknown>): OverviewRow {
  const n = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  return {
    data: String(row.data).slice(0, 10),
    cliente: String(row.cliente),
    meta_spend: n(row.meta_spend),
    google_spend: n(row.google_spend),
    total_impressions: n(row.total_impressions),
    total_clicks: n(row.total_clicks),
    ga4_sessions: n(row.ga4_sessions),
    ga4_conversions: n(row.ga4_conversions),
    instagram_reach: n(row.instagram_reach),
    instagram_interactions: n(row.instagram_interactions),
    meta_results: n(row.meta_results),
    meta_conversions: n(row.meta_conversions),
    google_conversions: n(row.google_conversions),
  };
}

function inDateRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
}

export const getClientOperationalReportFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<OperationalReport> => {
    await assertClienteAccess(context, data.cadastroClienteId);
    const periodInput: PeriodInput = {
      preset: data.preset,
      customFrom: data.customFrom,
      customTo: data.customTo,
    };
    const period = resolvePeriod(periodInput);

    const { data: cadastro, error: cadastroError } = await context.supabase
      .from("cadastro_clientes")
      .select("id, nome_cliente, slug")
      .eq("id", data.cadastroClienteId)
      .maybeSingle();
    if (cadastroError) throw new Error(cadastroError.message);
    if (!cadastro?.nome_cliente) throw new Error("Cliente não encontrado");

    const clienteNome = String(cadastro.nome_cliente);
    const clienteSlug = cadastro.slug != null ? String(cadastro.slug) : "";

    const [overviewRes, mediaRes, cardsRes] = await Promise.all([
      context.supabase
        .from("vw_overview_cliente")
        .select(OVERVIEW_CLIENTE_SELECT)
        .eq("cliente", clienteNome)
        .gte("data", period.prevFrom)
        .lte("data", period.to)
        .order("data", { ascending: true }),
      context.supabase
        .from("vw_ig_media_dashboard")
        .select("id, published_at, media_product_type, permalink, caption, metrics, content_card_id")
        .eq("cadastro_cliente_id", data.cadastroClienteId)
        .gte("published_at", `${period.prevFrom}T00:00:00.000Z`)
        .lte("published_at", `${period.to}T23:59:59.999Z`)
        .order("published_at", { ascending: false })
        .limit(800),
      context.supabase
        .from("content_cards")
        .select("id, status, formato, data_publicacao, publish_status, titulo")
        .eq("cadastro_cliente_id", data.cadastroClienteId)
        .gte("data_publicacao", period.prevFrom)
        .lte("data_publicacao", period.to)
        .neq("status", "arquivado"),
    ]);

    if (overviewRes.error) {
      console.warn("[relatorio] vw_overview_cliente:", overviewRes.error.message);
    }
    if (mediaRes.error) throw new Error(mediaRes.error.message);
    if (cardsRes.error) throw new Error(cardsRes.error.message);

    const overviewRows = (overviewRes.data ?? []).map((row) =>
      mapOverviewRow(row as Record<string, unknown>),
    );
    const overviewCurrent = sumOverview(
      overviewRows.filter((row) => row.data >= period.from && row.data <= period.to),
    );
    const overviewPrevious = sumOverview(
      overviewRows.filter((row) => row.data >= period.prevFrom && row.data <= period.prevTo),
    );

    const platformRows = await fetchPlatformRows(
      context.supabase,
      clienteNome,
      period.prevFrom,
      period.to,
    );

    const cardTitles = new Map<string, string>();
    for (const row of cardsRes.data ?? []) {
      if (row.id && row.titulo) cardTitles.set(String(row.id), String(row.titulo));
    }

    const allMedia: ReportMediaRow[] = (mediaRes.data ?? []).map((row) => ({
      id: String(row.id),
      published_at: String(row.published_at),
      media_product_type: String(row.media_product_type ?? ""),
      permalink: row.permalink != null ? String(row.permalink) : null,
      caption: row.caption != null ? String(row.caption) : null,
      metrics: (row.metrics as Record<string, number | undefined>) ?? {},
      contentTitle:
        row.content_card_id != null ? (cardTitles.get(String(row.content_card_id)) ?? null) : null,
    }));

    const postsCurrent = allMedia.filter((row) => inDateRange(row.published_at, period.from, period.to));
    const postsPrevious = allMedia.filter((row) =>
      inDateRange(row.published_at, period.prevFrom, period.prevTo),
    );

    const allCards: ReportCardRow[] = (cardsRes.data ?? []).map((row) => ({
      id: String(row.id),
      status: String(row.status),
      formato: row.formato != null ? String(row.formato) : null,
      data_publicacao: String(row.data_publicacao).slice(0, 10),
      publish_status: row.publish_status != null ? String(row.publish_status) : null,
    }));
    const cardsCurrent = allCards.filter((row) => inDateRange(row.data_publicacao, period.from, period.to));
    const cardsPrevious = allCards.filter((row) =>
      inDateRange(row.data_publicacao, period.prevFrom, period.prevTo),
    );

    return buildOperationalReport({
      clienteNome,
      cadastroClienteId: data.cadastroClienteId,
      clienteSlug,
      period,
      platformRows,
      postsCurrent,
      postsPrevious,
      cardsCurrent,
      cardsPrevious,
      overviewCurrent,
      overviewPrevious,
    });
  });
