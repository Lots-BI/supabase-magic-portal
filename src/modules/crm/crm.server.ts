import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { InstagramGraphClient } from "@/modules/platform-hub/plugins/instagram_organic/api/instagram-graph-client";
import { isStaffMember } from "@/modules/approval/internal/staff-auth.server";
import { coverageGap } from "./coverage";
import { nextAction, CHURN_LABEL } from "./next-action";
import {
  CRM_COLLECTOR_KEYS,
  CRM_SOURCE_BRAND_REPLY,
  CRM_SOURCE_PRIVATE_REPLY,
  type CrmCollectorKey,
  type CrmCollectorStatus,
} from "./types";
import {
  buildCommentThreads,
  type CrmCommentThread,
  type CrmThreadSource,
} from "./comment-threads";
import { isBrandAuthor } from "./skip-rules";
import { ignoreBrandPeople, loadCrmBrandAuthor } from "./ingest/brand-author.server";
import { isChurnQueue, isInboxNow, type CrmPeopleView } from "./inbox";
import { assertCanMerge, identitiesAfterMerge } from "./merge";
import { toCsv, toExportRow } from "./export-people";
import { consentedAudienceHashes } from "./custom-audience";
import { loadCrmRanking, type CrmRankingRow } from "./ranking.server";
import { recomputeAndStoreStats } from "./ingest/persist-signal.server";
import { syncCrmCommentsForCadastro } from "./ingest/sync-comments.server";
import { syncCrmDirectForCadastro } from "./ingest/sync-direct.server";
import { resolveCrmInstagramTarget } from "./ingest/resolve-crm-instagram-target.server";
import { personListTitle } from "./present";
import { periodRange } from "@/lib/metrics";
import type { PeriodDays } from "@/components/lots/PeriodToggle";

const cadastroSchema = z.object({ cadastroClienteId: z.number().int().positive() });
const daysSchema = z.union([z.literal(7), z.literal(30), z.literal(90)]);

type AuthCtx = {
  supabase: Parameters<typeof resolveIsAdmin>[0]["supabase"] & {
    from: ReturnType<typeof getSupabaseAdmin>["from"];
    rpc: ReturnType<typeof getSupabaseAdmin>["rpc"];
  };
  userId: string;
  claims?: { email?: string | null };
};

async function assertAdminOrClientScope(ctx: AuthCtx, cadastroClienteId: number) {
  const admin = await resolveIsAdmin({
    supabase: ctx.supabase,
    userId: ctx.userId,
    email: ctx.claims?.email,
  });
  if (admin) return { role: "admin" as const };
  const staff = await isStaffMember(ctx);
  if (staff) return { role: "staff" as const };
  const { data, error } = await ctx.supabase.rpc("current_user_cadastro_cliente_ids");
  if (error) throw new Error(error.message);
  const ids = (data as number[] | null) ?? [];
  if (!ids.includes(cadastroClienteId)) throw new Error("Forbidden");
  return { role: "cliente" as const };
}

export type CrmCollectorChip = {
  key: CrmCollectorKey;
  status: CrmCollectorStatus;
  detail: string | null;
  label: string;
};

const COLLECTOR_LABEL: Record<CrmCollectorKey, string> = {
  comments: "Comentários Instagram",
  dm: "Direct",
  lead_ads: "Lead Ads",
  whatsapp: "WhatsApp",
  ingest_api: "API de ingestão",
  gbp_reviews: "Avaliações GBP",
  likes: "Curtidas",
};

export type CrmCoveragePayload = {
  cadastroClienteId: number;
  collectors: CrmCollectorChip[];
  gap: { mediaComments: number; identifiedComments: number; gap: number };
  lastRanAt: string | null;
};

export type CrmPersonListRow = {
  id: string;
  cadastroClienteId: number;
  clienteNome: string | null;
  clienteSlug: string | null;
  displayName: string;
  igUsername: string | null;
  isVip: boolean;
  signalCount: number;
  churnState: string;
  churnLabel: string;
  intentScore: number;
  heatScore: number;
  recencyDays: number;
  piiCompleteness: number;
  firstSignalAt: string | null;
  lastSignalAt: string | null;
  lastKind: string | null;
  ownerUserId: string | null;
  ownerNome: string | null;
  nextAction: string;
  nextActionCode: string;
  placeCounts: Record<string, number>;
  pillarAffinity: Record<string, number>;
  mediaDistinct: number;
};

function countRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const counts: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const count = Number(raw);
    if (Number.isFinite(count) && count > 0) counts[key] = count;
  }
  return counts;
}

function mapListRow(row: Record<string, unknown>): CrmPersonListRow {
  const churn = String(row.churn_state ?? "novo");
  const lastKind = (row.last_kind as string | null) ?? null;
  const stats = {
    signalCount: Number(row.signal_count ?? 0),
    kindCounts: {},
    placeCounts: {},
    mediaDistinct: Number(row.media_distinct ?? 0),
    cardDistinct: Number(row.card_distinct ?? 0),
    pillarAffinity: {},
    recencyDays: Number(row.recency_days ?? 0),
    tenureDays: Number(row.tenure_days ?? 0),
    activeWeeks: Number(row.active_weeks ?? 0),
    streakWeeks: Number(row.streak_weeks ?? 0),
    churnState: churn as "novo",
    intentScore: Number(row.intent_score ?? 0),
    piiCompleteness: Number(row.pii_completeness ?? 0),
    heatScore: Number(row.heat_score ?? 0),
    firstSignalAt: (row.first_signal_at as string | null) ?? null,
    lastSignalAt: (row.last_signal_at as string | null) ?? null,
  };
  const action = nextAction({ stats, lastKind });
  return {
    id: String(row.id),
    cadastroClienteId: Number(row.cadastro_cliente_id),
    clienteNome: (row.cliente_nome as string | null) ?? null,
    clienteSlug: (row.cliente_slug as string | null) ?? null,
    displayName: String(row.display_name),
    igUsername: (row.ig_username as string | null) ?? null,
    isVip: Boolean(row.is_vip),
    signalCount: stats.signalCount,
    churnState: churn,
    churnLabel: CHURN_LABEL[churn as keyof typeof CHURN_LABEL] ?? churn,
    intentScore: stats.intentScore,
    heatScore: stats.heatScore,
    recencyDays: stats.recencyDays,
    piiCompleteness: stats.piiCompleteness,
    firstSignalAt: (row.first_signal_at as string | null) ?? stats.firstSignalAt,
    lastSignalAt: stats.lastSignalAt,
    lastKind,
    ownerUserId: (row.owner_user_id as string | null) ?? null,
    ownerNome: (row.owner_nome as string | null) ?? null,
    nextAction: action.label,
    nextActionCode: action.code,
    placeCounts: countRecord(row.place_counts),
    pillarAffinity: countRecord(row.pillar_affinity),
    mediaDistinct: Number(row.media_distinct ?? 0),
  };
}

export const getCrmCoverageFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cadastroSchema.parse(d))
  .handler(async ({ data, context }): Promise<CrmCoveragePayload> => {
    await assertAdminOrClientScope(context, data.cadastroClienteId);
    const { data: collectors } = await context.supabase
      .from("crm_collector_state")
      .select("collector_key, status, detail")
      .eq("cadastro_cliente_id", data.cadastroClienteId);

    const byKey = new Map((collectors ?? []).map((row) => [row.collector_key, row]));
    const chips: CrmCollectorChip[] = CRM_COLLECTOR_KEYS.map((key) => {
      const row = byKey.get(key);
      const fallbackStatus: CrmCollectorStatus =
        key === "likes" ? "impossible" : key === "comments" ? "planned" : "planned";
      return {
        key,
        status: (row?.status as CrmCollectorStatus | undefined) ?? fallbackStatus,
        detail:
          row?.detail ??
          (key === "likes"
            ? "A Graph não lista quem curtiu."
            : key === "comments"
              ? "Ainda não coletamos comentadores nesta conta."
              : key === "ingest_api"
                ? "Opcional para formulário do site. Direct Instagram entra pela Graph, no Lots."
                : key === "dm"
                  ? "Direct: caso de uso Mensagens no app Meta + Relogin. Sem ManyChat."
                  : "Próximo coletor."),
        label: COLLECTOR_LABEL[key],
      };
    });

    const { data: media } = await context.supabase
      .from("ig_media")
      .select("metrics")
      .eq("cadastro_cliente_id", data.cadastroClienteId);
    const mediaComments = (media ?? []).reduce((sum, row) => {
      const metrics = row.metrics as Record<string, number> | null;
      const n = metrics?.comments;
      return sum + (typeof n === "number" ? n : 0);
    }, 0);
    const { count } = await context.supabase
      .from("crm_signals")
      .select("id", { count: "exact", head: true })
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .in("kind", ["comment", "reply"]);

    const { data: cursor } = await context.supabase
      .from("crm_ingest_cursors")
      .select("last_ran_at")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .order("last_ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      cadastroClienteId: data.cadastroClienteId,
      collectors: chips,
      gap: coverageGap(mediaComments, count ?? 0),
      lastRanAt: cursor?.last_ran_at ?? null,
    };
  });

export const listCrmPeopleFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive().optional(),
        days: daysSchema,
        q: z.string().optional(),
        churn: z.string().optional(),
        vipOnly: z.boolean().optional(),
        hasPii: z.boolean().optional(),
        view: z.enum(["all", "inbox", "churn"]).optional(),
        mine: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<CrmPersonListRow[]> => {
    const admin = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email,
    });
    if (data.cadastroClienteId) {
      await assertAdminOrClientScope(context, data.cadastroClienteId);
    } else if (!admin) {
      throw new Error("Forbidden");
    }

    const period = periodRange(data.days as PeriodDays);
    let query = context.supabase
      .from("vw_crm_people_list")
      .select("*")
      .is("ignored_at", null)
      .is("merged_into_id", null)
      .gte("last_signal_at", period.from)
      .order("heat_score", { ascending: false });

    if (data.cadastroClienteId) query = query.eq("cadastro_cliente_id", data.cadastroClienteId);
    if (data.churn) query = query.eq("churn_state", data.churn);
    if (data.vipOnly) query = query.eq("is_vip", true);
    if (data.hasPii) query = query.gt("pii_completeness", 0);
    if (data.mine) query = query.eq("owner_user_id", context.userId);
    if (data.q?.trim()) {
      const q = data.q
        .trim()
        .replace(/^@/, "")
        .replace(/[%*,()]/g, "");
      if (q) query = query.or(`display_name.ilike.%${q}%,ig_username.ilike.%${q}%`);
    }

    const { data: rows, error } = await query.limit(400);
    if (error) throw new Error(error.message);
    const mapped = (rows ?? []).map((row) => mapListRow(row as Record<string, unknown>));
    const view = (data.view ?? "all") as CrmPeopleView;
    const filtered =
      view === "inbox"
        ? mapped
            .filter((p) =>
              isInboxNow({
                ignoredAt: null,
                lastKind: p.lastKind,
              }),
            )
            .sort(
              (a, b) =>
                (b.lastSignalAt ?? "").localeCompare(a.lastSignalAt ?? "") ||
                b.intentScore - a.intentScore,
            )
        : view === "churn"
          ? mapped.filter((p) => isChurnQueue(p.churnState, null))
          : mapped;
    return filtered.slice(0, 200);
  });

export type CrmCommentFeedThread = CrmCommentThread & {
  privateReplied: boolean;
  canPrivateReply: boolean;
};

export type CrmCommentFeed = {
  brandName: string;
  threads: CrmCommentFeedThread[];
};

type CommentSignalRow = {
  id: string;
  person_id: string;
  body: string | null;
  occurred_at: string;
  place: string;
  payload: unknown;
  external_id: string;
  kind: string;
  source: string;
};

type CommentPayload = {
  permalink?: string | null;
  captionExcerpt?: string | null;
  parentId?: string | null;
  inReplyTo?: string | null;
  privateReplyTo?: string | null;
  hidden?: boolean;
  igsid?: string | null;
  username?: string | null;
};

const COMMENT_SIGNAL_COLUMNS =
  "id, person_id, body, occurred_at, place, payload, external_id, kind, source";
const PRIVATE_REPLY_WINDOW_MS = 7 * 86_400_000;

export const listCrmCommentsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive(), days: daysSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CrmCommentFeed> => {
    await assertAdminOrClientScope(context, data.cadastroClienteId);
    const admin = getSupabaseAdmin();
    const brand = await loadCrmBrandAuthor(admin, data.cadastroClienteId);
    await ignoreBrandPeople(admin, data.cadastroClienteId, brand);
    const brandHandle = [...brand.usernames][0];
    const brandName = brandHandle ? `@${brandHandle}` : "Marca";

    const period = periodRange(data.days as PeriodDays);
    const { data: signals, error } = await context.supabase
      .from("crm_signals")
      .select(COMMENT_SIGNAL_COLUMNS)
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .in("kind", ["comment", "reply", "brand_reply"])
      .gte("occurred_at", period.from)
      .order("occurred_at", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);
    const rows = (signals ?? []) as CommentSignalRow[];
    if (rows.length === 0) return { brandName, threads: [] };

    const loaded = new Set(rows.map((row) => row.external_id));
    const missingParents = [
      ...new Set(
        rows
          .map((row) => (row.payload as CommentPayload | null)?.parentId)
          .filter((id): id is string => typeof id === "string" && !loaded.has(id)),
      ),
    ];
    if (missingParents.length > 0) {
      const { data: parents } = await context.supabase
        .from("crm_signals")
        .select(COMMENT_SIGNAL_COLUMNS)
        .eq("cadastro_cliente_id", data.cadastroClienteId)
        .in("kind", ["comment", "reply"])
        .in("external_id", missingParents.slice(0, 100));
      rows.push(...((parents ?? []) as CommentSignalRow[]));
    }

    const personIds = [...new Set(rows.map((row) => row.person_id))];
    const [{ data: people }, { data: ignored }] = await Promise.all([
      context.supabase
        .from("vw_crm_people_list")
        .select("id, display_name, ig_username")
        .in("id", personIds),
      admin.from("crm_people").select("id").in("id", personIds).not("ignored_at", "is", null),
    ]);
    const names = new Map(
      (people ?? []).map((person) => [
        person.id as string,
        personListTitle(person.display_name, person.ig_username),
      ]),
    );
    const ignoredIds = new Set((ignored ?? []).map((row) => row.id as string));

    const privateReplied = new Set<string>();
    const sources: CrmThreadSource[] = [];
    for (const row of rows) {
      const payload = (row.payload ?? {}) as CommentPayload;
      if (row.source === CRM_SOURCE_PRIVATE_REPLY) {
        if (payload.privateReplyTo) privateReplied.add(payload.privateReplyTo);
        continue;
      }
      if (row.kind === "brand_reply" && row.source !== CRM_SOURCE_BRAND_REPLY) continue;
      const fromBrand =
        row.kind === "brand_reply" ||
        isBrandAuthor({ id: payload.igsid, username: payload.username }, brand);
      if (!fromBrand && ignoredIds.has(row.person_id)) continue;
      sources.push({
        id: row.id,
        personId: row.person_id,
        personName:
          names.get(row.person_id) ?? (payload.username ? `@${payload.username}` : "Pessoa"),
        body: row.body,
        occurredAt: row.occurred_at,
        place: row.place,
        permalink: payload.permalink ?? null,
        captionExcerpt: payload.captionExcerpt ?? null,
        externalId: row.external_id,
        kind: fromBrand ? "brand_reply" : (row.kind as "comment" | "reply"),
        parentId: payload.parentId ?? null,
        inReplyTo: payload.inReplyTo ?? null,
        hidden: payload.hidden === true,
      });
    }

    const now = Date.now();
    const threads = buildCommentThreads(sources, { brandName })
      .slice(0, 80)
      .map((thread) => ({
        ...thread,
        privateReplied: privateReplied.has(thread.externalId),
        canPrivateReply:
          !privateReplied.has(thread.externalId) &&
          now - Date.parse(thread.occurredAt) < PRIVATE_REPLY_WINDOW_MS,
      }));
    return { brandName, threads };
  });

export type CrmPersonDetail = {
  person: CrmPersonListRow;
  identities: { kind: string; value: string; source: string | null }[];
  facts: { field: string; value: string; source: string; collectedAt: string }[];
  signals: {
    id: string;
    kind: string;
    place: string;
    body: string | null;
    occurredAt: string;
    permalink: string | null;
    pilarTitulo: string | null;
    tema: string | null;
    source: string;
    externalId: string;
  }[];
  notes: { id: string; body: string; createdAt: string }[];
  kindCounts: Record<string, number>;
  placeCounts: Record<string, number>;
  pillarAffinity: Record<string, number>;
  mediaGaps: { igMediaId: string; mediaComments: number; ingestedComments: number; gap: number }[];
};

export const getCrmPersonFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ personId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<CrmPersonDetail> => {
    const { data: person, error } = await context.supabase
      .from("vw_crm_people_list")
      .select("*")
      .eq("id", data.personId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!person) throw new Error("Pessoa não encontrada");
    await assertAdminOrClientScope(context, Number(person.cadastro_cliente_id));

    const admin = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email,
    });

    const [{ data: identities }, { data: facts }, { data: signals }, notesRes, { data: stats }] =
      await Promise.all([
        context.supabase
          .from("crm_identities")
          .select("kind, value, source")
          .eq("person_id", data.personId),
        context.supabase
          .from("crm_field_facts")
          .select("field, value, source, collected_at")
          .eq("person_id", data.personId),
        context.supabase
          .from("crm_signals")
          .select("id, kind, place, body, occurred_at, payload, source, external_id, ig_media_id")
          .eq("person_id", data.personId)
          .order("occurred_at", { ascending: false })
          .limit(80),
        admin
          ? context.supabase
              .from("crm_person_notes")
              .select("id, body, created_at")
              .eq("person_id", data.personId)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as { id: string; body: string; created_at: string }[] }),
        context.supabase
          .from("crm_person_stats")
          .select("kind_counts, place_counts, pillar_affinity")
          .eq("person_id", data.personId)
          .maybeSingle(),
      ]);

    const mediaIds = [
      ...new Set(
        (signals ?? []).map((s) => s.ig_media_id).filter((id): id is string => Boolean(id)),
      ),
    ];
    const mediaGaps: CrmPersonDetail["mediaGaps"] = [];
    if (mediaIds.length > 0) {
      const { data: media } = await context.supabase
        .from("ig_media")
        .select("id, metrics")
        .in("id", mediaIds);
      for (const m of media ?? []) {
        const metrics = m.metrics as Record<string, number> | null;
        const mediaComments = typeof metrics?.comments === "number" ? metrics.comments : 0;
        const ingested = (signals ?? []).filter((s) => s.ig_media_id === m.id).length;
        mediaGaps.push({
          igMediaId: m.id,
          mediaComments,
          ingestedComments: ingested,
          gap: Math.max(0, mediaComments - ingested),
        });
      }
    }

    return {
      person: mapListRow(person as Record<string, unknown>),
      identities: (identities ?? []).map((i) => ({
        kind: i.kind,
        value: i.value,
        source: i.source,
      })),
      facts: (facts ?? []).map((f) => ({
        field: f.field,
        value: f.value,
        source: f.source,
        collectedAt: f.collected_at,
      })),
      signals: (signals ?? []).map((s) => {
        const payload = (s.payload ?? {}) as Record<string, unknown>;
        return {
          id: s.id,
          kind: s.kind,
          place: s.place,
          body: s.body,
          occurredAt: s.occurred_at,
          permalink: (payload.permalink as string | null) ?? null,
          pilarTitulo: (payload.pilarTitulo as string | null) ?? null,
          tema: (payload.tema as string | null) ?? null,
          source: s.source,
          externalId: s.external_id,
        };
      }),
      notes: (notesRes.data ?? []).map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.created_at,
      })),
      kindCounts: (stats?.kind_counts as Record<string, number>) ?? {},
      placeCounts: (stats?.place_counts as Record<string, number>) ?? {},
      pillarAffinity: (stats?.pillar_affinity as Record<string, number>) ?? {},
      mediaGaps,
    };
  });

export type CrmPortfolioRow = {
  cadastroClienteId: number;
  clienteNome: string;
  clienteSlug: string | null;
  people: number;
  active7d: number;
  gap: number;
  commentsStatus: string;
};

export const listCrmPortfolioFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: daysSchema }).parse(d))
  .handler(async ({ context }): Promise<CrmPortfolioRow[]> => {
    const ok = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email,
      repair: true,
    });
    if (!ok) throw new Error("Forbidden: admin role required");

    const { data: ativos, error } = await context.supabase
      .from("cadastro_clientes")
      .select("id, nome_cliente, slug, instagram_ativo")
      .eq("ativo", true)
      .order("nome_cliente");
    if (error) throw new Error(error.message);

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const rows: CrmPortfolioRow[] = [];
    for (const cliente of ativos ?? []) {
      const [{ count: people }, { count: active7d }, { data: collector }] = await Promise.all([
        context.supabase
          .from("crm_people")
          .select("id", { count: "exact", head: true })
          .eq("cadastro_cliente_id", cliente.id)
          .is("ignored_at", null),
        context.supabase
          .from("crm_people")
          .select("id", { count: "exact", head: true })
          .eq("cadastro_cliente_id", cliente.id)
          .is("ignored_at", null)
          .gte("last_signal_at", weekAgo),
        context.supabase
          .from("crm_collector_state")
          .select("status")
          .eq("cadastro_cliente_id", cliente.id)
          .eq("collector_key", "comments")
          .maybeSingle(),
      ]);
      rows.push({
        cadastroClienteId: cliente.id,
        clienteNome: cliente.nome_cliente,
        clienteSlug: cliente.slug,
        people: people ?? 0,
        active7d: active7d ?? 0,
        gap: 0,
        commentsStatus: collector?.status ?? (cliente.instagram_ativo ? "planned" : "planned"),
      });
    }
    return rows;
  });

export const syncCrmCommentsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cadastroSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { role } = await assertAdminOrClientScope(context, data.cadastroClienteId);
    if (role === "cliente") throw new Error("Forbidden");
    const admin = getSupabaseAdmin();
    const comments = await syncCrmCommentsForCadastro(admin, data.cadastroClienteId);
    try {
      const direct = await syncCrmDirectForCadastro(admin, data.cadastroClienteId);
      return { ...comments, direct };
    } catch (error) {
      return {
        ...comments,
        direct: {
          ok: false,
          conversationsScanned: 0,
          messagesFetched: 0,
          peopleTouched: 0,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });

export const setCrmPersonVipFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ personId: z.string().uuid(), isVip: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ok = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email,
    });
    if (!ok) throw new Error("Forbidden");
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("crm_people")
      .update({ is_vip: data.isVip })
      .eq("id", data.personId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ignoreCrmPersonFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ personId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ok = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email,
    });
    if (!ok) throw new Error("Forbidden");
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("crm_people")
      .update({ ignored_at: new Date().toISOString() })
      .eq("id", data.personId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addCrmPersonNoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ personId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ok = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email,
    });
    if (!ok) throw new Error("Forbidden");
    const admin = getSupabaseAdmin();
    const { data: person } = await admin
      .from("crm_people")
      .select("cadastro_cliente_id")
      .eq("id", data.personId)
      .maybeSingle();
    if (!person) throw new Error("Pessoa não encontrada");
    const { error } = await admin.from("crm_person_notes").insert({
      person_id: data.personId,
      cadastro_cliente_id: person.cadastro_cliente_id,
      body: data.body.trim(),
      author_user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function threadRootCommentId(
  graph: InstagramGraphClient,
  accessToken: string,
  signal: { kind: string; external_id: string; payload: unknown },
): Promise<string> {
  const payload = (signal.payload ?? {}) as { parentId?: string | null };
  if (signal.kind === "comment") return signal.external_id;
  if (payload.parentId) return payload.parentId;
  try {
    const parent = await graph.getCommentParentId(accessToken, signal.external_id);
    if (parent) return parent;
  } catch {
    /* o id do próprio comentário ainda pode ser a raiz */
  }
  return signal.external_id;
}

export const replyCrmCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        signalId: z.string().uuid(),
        message: z.string().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ok = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email: context.claims?.email,
    });
    if (!ok) throw new Error("Forbidden");
    const admin = getSupabaseAdmin();
    const signal = await loadCommentSignal(admin, data.signalId, ["comment", "reply"]);
    const target = await resolveCrmInstagramTarget(admin, signal.cadastro_cliente_id);
    if ("error" in target) throw new Error(target.detail);
    const graph = new InstagramGraphClient({ httpClient: new FetchHttpClient() });
    const graphCommentId = await threadRootCommentId(graph, target.accessToken, signal);
    const posted = await graph.replyToComment(target.accessToken, graphCommentId, data.message);
    const payload = (signal.payload ?? {}) as CommentPayload;
    await admin.from("crm_signals").insert({
      person_id: signal.person_id,
      cadastro_cliente_id: signal.cadastro_cliente_id,
      kind: "brand_reply",
      place: signal.place,
      source: CRM_SOURCE_BRAND_REPLY,
      external_id: posted.id,
      body: data.message,
      occurred_at: new Date().toISOString(),
      ig_media_id: signal.ig_media_id,
      payload: {
        inReplyTo: signal.external_id,
        parentId: graphCommentId,
        permalink: payload.permalink ?? null,
      },
    });
    return { ok: true, id: posted.id };
  });

type CommentActionSignal = {
  id: string;
  person_id: string;
  cadastro_cliente_id: number;
  external_id: string;
  kind: string;
  source: string;
  place: string;
  occurred_at: string;
  ig_media_id: string | null;
  payload: unknown;
};

async function loadCommentSignal(
  admin: ReturnType<typeof getSupabaseAdmin>,
  signalId: string,
  kinds: readonly string[],
): Promise<CommentActionSignal> {
  const { data: signal, error } = await admin
    .from("crm_signals")
    .select(
      "id, person_id, cadastro_cliente_id, external_id, kind, source, place, occurred_at, ig_media_id, payload",
    )
    .eq("id", signalId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!signal || !kinds.includes(signal.kind)) throw new Error("Sinal não é um comentário");
  if (signal.kind === "brand_reply" && signal.source !== CRM_SOURCE_BRAND_REPLY) {
    throw new Error("Só respostas públicas da marca podem ser alteradas aqui.");
  }
  return signal as CommentActionSignal;
}

async function commentActionTarget(context: AuthCtx, signalId: string, kinds: readonly string[]) {
  await requireAdmin(context);
  const admin = getSupabaseAdmin();
  const signal = await loadCommentSignal(admin, signalId, kinds);
  const target = await resolveCrmInstagramTarget(admin, signal.cadastro_cliente_id);
  if ("error" in target) throw new Error(target.detail);
  const graph = new InstagramGraphClient({ httpClient: new FetchHttpClient() });
  return { admin, signal, target, graph };
}

export const hideCrmCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ signalId: z.string().uuid(), hide: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, signal, target, graph } = await commentActionTarget(context, data.signalId, [
      "comment",
      "reply",
    ]);
    await graph.setCommentHidden(target.accessToken, signal.external_id, data.hide);
    const payload = (signal.payload ?? {}) as Record<string, unknown>;
    const { error } = await admin
      .from("crm_signals")
      .update({ payload: { ...payload, hidden: data.hide } })
      .eq("id", signal.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCrmCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ signalId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, signal, target, graph } = await commentActionTarget(context, data.signalId, [
      "comment",
      "reply",
      "brand_reply",
    ]);
    await graph.deleteComment(target.accessToken, signal.external_id);
    const { error } = await admin
      .from("crm_signals")
      .delete()
      .eq("cadastro_cliente_id", signal.cadastro_cliente_id)
      .or(`id.eq.${signal.id},payload->>parentId.eq.${signal.external_id}`);
    if (error) throw new Error(error.message);
    await recomputeAndStoreStats(admin, signal.person_id, signal.cadastro_cliente_id);
    return { ok: true };
  });

export const privateReplyCrmCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ signalId: z.string().uuid(), message: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, signal, target, graph } = await commentActionTarget(context, data.signalId, [
      "comment",
      "reply",
    ]);
    if (Date.now() - Date.parse(signal.occurred_at) >= PRIVATE_REPLY_WINDOW_MS) {
      throw new Error("O Instagram só permite Direct a partir de comentários com até 7 dias.");
    }
    const { data: existing } = await admin
      .from("crm_signals")
      .select("id")
      .eq("cadastro_cliente_id", signal.cadastro_cliente_id)
      .eq("source", CRM_SOURCE_PRIVATE_REPLY)
      .eq("payload->>privateReplyTo", signal.external_id)
      .limit(1);
    if ((existing ?? []).length > 0) {
      throw new Error("Este comentário já recebeu um Direct. O Instagram permite só um.");
    }
    const sent = await graph.sendPrivateReply(
      target.accessToken,
      target.igUserId,
      signal.external_id,
      data.message,
    );
    await admin.from("crm_signals").insert({
      person_id: signal.person_id,
      cadastro_cliente_id: signal.cadastro_cliente_id,
      kind: "brand_reply",
      place: "unknown",
      source: CRM_SOURCE_PRIVATE_REPLY,
      external_id: sent.id,
      body: data.message,
      occurred_at: new Date().toISOString(),
      payload: { privateReplyTo: signal.external_id },
    });
    return { ok: true, id: sent.id };
  });

async function requireAdmin(context: AuthCtx) {
  const ok = await resolveIsAdmin({
    supabase: context.supabase,
    userId: context.userId,
    email: context.claims?.email,
  });
  if (!ok) throw new Error("Forbidden");
}

export const getCrmRankingFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive(), days: daysSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CrmRankingRow[]> => {
    await assertAdminOrClientScope(context, data.cadastroClienteId);
    return loadCrmRanking(context.supabase, data.cadastroClienteId, data.days as PeriodDays);
  });

export type { CrmRankingRow };

export const exportCrmPeopleFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive(), days: daysSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ csv: string; rows: number }> => {
    await assertAdminOrClientScope(context, data.cadastroClienteId);
    const period = periodRange(data.days as PeriodDays);
    const { data: people, error } = await context.supabase
      .from("vw_crm_people_list")
      .select("*")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .is("ignored_at", null)
      .is("merged_into_id", null)
      .gte("last_signal_at", period.from)
      .limit(500);
    if (error) throw new Error(error.message);
    const list = people ?? [];
    if (list.length === 0) return { csv: toCsv([]), rows: 0 };
    const ids = list.map((p) => p.id);

    const [{ data: identities }, { data: facts }] = await Promise.all([
      context.supabase.from("crm_identities").select("person_id, kind, value").in("person_id", ids),
      context.supabase
        .from("crm_field_facts")
        .select("person_id, field, value")
        .in("person_id", ids),
    ]);
    const idByPerson = new Map<string, { kind: string; value: string }[]>();
    for (const row of identities ?? []) {
      const group = idByPerson.get(row.person_id) ?? [];
      group.push({ kind: row.kind, value: row.value });
      idByPerson.set(row.person_id, group);
    }
    const factsByPerson = new Map<string, { field: string; value: string }[]>();
    for (const row of facts ?? []) {
      const group = factsByPerson.get(row.person_id) ?? [];
      group.push({ field: row.field, value: row.value });
      factsByPerson.set(row.person_id, group);
    }
    const rows = list.map((p) =>
      toExportRow({
        personId: p.id,
        displayName: p.display_name,
        firstSeen: p.first_signal_at,
        lastSeen: p.last_signal_at,
        intentScore: p.intent_score ?? 0,
        churnState: p.churn_state ?? "novo",
        identities: idByPerson.get(p.id) ?? [],
        facts: factsByPerson.get(p.id) ?? [],
      }),
    );
    return { csv: toCsv(rows), rows: rows.length };
  });

export const assignCrmPersonFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        personId: z.string().uuid(),
        ownerUserId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const admin = getSupabaseAdmin();
    const owner = data.ownerUserId === undefined ? context.userId : data.ownerUserId;
    const { error } = await admin
      .from("crm_people")
      .update({ owner_user_id: owner })
      .eq("id", data.personId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mergeCrmPeopleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ fromId: z.string().uuid(), intoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const admin = getSupabaseAdmin();
    const { data: rows, error } = await admin
      .from("crm_people")
      .select("id, cadastro_cliente_id, is_vip, merged_into_id")
      .in("id", [data.fromId, data.intoId]);
    if (error) throw new Error(error.message);
    const from = rows?.find((r) => r.id === data.fromId);
    const into = rows?.find((r) => r.id === data.intoId);
    if (!from || !into) throw new Error("Pessoa não encontrada");
    const plan = assertCanMerge(
      {
        id: from.id,
        cadastroClienteId: from.cadastro_cliente_id,
        mergedIntoId: from.merged_into_id,
        isVip: from.is_vip,
      },
      {
        id: into.id,
        cadastroClienteId: into.cadastro_cliente_id,
        mergedIntoId: into.merged_into_id,
        isVip: into.is_vip,
      },
    );

    const { data: fromIdentities } = await admin
      .from("crm_identities")
      .select("kind, value, person_id")
      .eq("person_id", data.fromId);
    const { data: intoIdentities } = await admin
      .from("crm_identities")
      .select("kind, value, person_id")
      .eq("person_id", data.intoId);
    const { dropFrom } = identitiesAfterMerge(fromIdentities ?? [], intoIdentities ?? []);
    for (const ident of dropFrom) {
      await admin
        .from("crm_identities")
        .delete()
        .eq("person_id", data.fromId)
        .eq("kind", ident.kind)
        .eq("value", ident.value);
    }
    await admin
      .from("crm_identities")
      .update({ person_id: data.intoId })
      .eq("person_id", data.fromId);
    const { data: fromFacts } = await admin
      .from("crm_field_facts")
      .select("field, source")
      .eq("person_id", data.fromId);
    const { data: intoFacts } = await admin
      .from("crm_field_facts")
      .select("field, source")
      .eq("person_id", data.intoId);
    const intoFactKeys = new Set((intoFacts ?? []).map((f) => `${f.field}:${f.source}`));
    for (const fact of fromFacts ?? []) {
      if (intoFactKeys.has(`${fact.field}:${fact.source}`)) {
        await admin
          .from("crm_field_facts")
          .delete()
          .eq("person_id", data.fromId)
          .eq("field", fact.field)
          .eq("source", fact.source);
      }
    }
    await admin.from("crm_signals").update({ person_id: data.intoId }).eq("person_id", data.fromId);
    await admin
      .from("crm_field_facts")
      .update({ person_id: data.intoId })
      .eq("person_id", data.fromId);
    await admin
      .from("crm_person_notes")
      .update({ person_id: data.intoId })
      .eq("person_id", data.fromId);
    await admin
      .from("crm_people")
      .update({
        is_vip: plan.vip,
      })
      .eq("id", data.intoId);
    await admin
      .from("crm_people")
      .update({
        merged_into_id: data.intoId,
        ignored_at: new Date().toISOString(),
      })
      .eq("id", data.fromId);
    await recomputeAndStoreStats(admin, data.intoId, into.cadastro_cliente_id);
    return { ok: true, intoId: data.intoId };
  });

export const previewCrmCustomAudienceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cadastroSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: people } = await context.supabase
      .from("crm_people")
      .select("id")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .is("ignored_at", null)
      .is("merged_into_id", null);
    const ids = (people ?? []).map((p) => p.id);
    if (ids.length === 0) {
      return { emailCount: 0, phoneCount: 0, refusedReason: "no_consented_facts" as const };
    }
    const { data: facts } = await context.supabase
      .from("crm_field_facts")
      .select("field, value")
      .in("person_id", ids)
      .in("field", ["email", "phone"]);
    const hashed = consentedAudienceHashes(facts ?? []);
    return {
      emailCount: hashed.emailHashes.length,
      phoneCount: hashed.phoneHashes.length,
      refusedReason: hashed.refusedReason,
    };
  });

export const replyCrmDmFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ personId: z.string().uuid(), message: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const admin = getSupabaseAdmin();
    const { data: person } = await admin
      .from("crm_people")
      .select("cadastro_cliente_id")
      .eq("id", data.personId)
      .maybeSingle();
    if (!person) throw new Error("Pessoa não encontrada");
    const { data: igsid } = await admin
      .from("crm_identities")
      .select("value")
      .eq("person_id", data.personId)
      .eq("kind", "igsid")
      .maybeSingle();
    if (!igsid?.value) throw new Error("Esta pessoa não tem IGSID para Direct.");
    const target = await resolveCrmInstagramTarget(admin, person.cadastro_cliente_id);
    if ("error" in target) throw new Error(target.detail);
    const graph = new InstagramGraphClient({ httpClient: new FetchHttpClient() });
    const posted = await graph.sendDirectMessage(
      target.accessToken,
      target.igUserId,
      igsid.value,
      data.message,
    );
    await admin.from("crm_signals").insert({
      person_id: data.personId,
      cadastro_cliente_id: person.cadastro_cliente_id,
      kind: "brand_reply",
      place: "unknown",
      source: "instagram_dm_reply",
      external_id: posted.id,
      body: data.message,
      occurred_at: new Date().toISOString(),
    });
    return { ok: true, id: posted.id };
  });

export type CrmIngestTokenRow = {
  id: string;
  label: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export const listCrmIngestTokensFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cadastroSchema.parse(d))
  .handler(async ({ data, context }): Promise<CrmIngestTokenRow[]> => {
    await requireAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("crm_ingest_tokens")
      .select("id, label, token_prefix, last_used_at, revoked_at, created_at")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      tokenPrefix: row.token_prefix,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
    }));
  });

export const createCrmIngestTokenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        label: z.string().trim().min(1).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<CrmIngestTokenRow & { token: string }> => {
    await requireAdmin(context);
    const { generateCrmIngestToken } = await import("./ingest/ingest-token");
    const minted = generateCrmIngestToken();
    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin
      .from("crm_ingest_tokens")
      .insert({
        cadastro_cliente_id: data.cadastroClienteId,
        label: data.label,
        token_prefix: minted.prefix,
        token_hash: minted.hash,
        created_by: context.userId,
      })
      .select("id, label, token_prefix, last_used_at, revoked_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    const { data: collector } = await admin
      .from("crm_collector_state")
      .select("status")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .eq("collector_key", "ingest_api")
      .maybeSingle();
    if (!collector || collector.status === "planned") {
      await admin.from("crm_collector_state").upsert(
        {
          cadastro_cliente_id: data.cadastroClienteId,
          collector_key: "ingest_api",
          status: "planned",
          detail: "Token criado. Aguardando o primeiro evento.",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cadastro_cliente_id,collector_key" },
      );
    }
    return {
      id: row.id,
      label: row.label,
      tokenPrefix: row.token_prefix,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
      token: minted.plaintext,
    };
  });

export const revokeCrmIngestTokenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tokenId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin
      .from("crm_ingest_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.tokenId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Token não encontrado ou já revogado.");
    return { ok: true };
  });
