// Lots BI · Server functions — Plano Estratégico (Centro de Inteligência).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { resolvePeriod } from "@/lib/period";
import { getPlatformDef, PLATFORM_REGISTRY } from "@/lib/platforms/registry";
import type { Row } from "@/lib/platforms/types";
import { aggregatePeriod, platformViewSelect } from "@/lib/platforms/engine";
import { z } from "zod";
import {
  PLANO_STATUS,
  PLANO_PRIORIDADE,
  PLANO_ITEM_STATUS,
  PLANO_EVENTO_TIPO,
  HIPOTESE_STATUS,
  OPORTUNIDADE_ORIGEM,
  DECISAO_RESULTADO_STATUS,
  ROADMAP_MARCO_TIPO,
  type PlanoDetail,
  type EstrategiaEditorialStats,
  type StrategicDashboardPayload,
} from "@/lib/strategic-plan/types";
import { validateMetricRef } from "@/lib/strategic-plan/metric-catalog";
import { computeMetricProgress, objectiveProgressPct } from "@/lib/strategic-plan/metric-progress";
import { buildDiagnostico } from "@/lib/strategic-plan/diagnostico";
import { deriveOportunidadesRegra, mergeOportunidades } from "@/lib/strategic-plan/oportunidades";
import { deriveProximosPassos } from "@/lib/strategic-plan/proximos-passos";
import { buildRadarAxes } from "@/lib/strategic-plan/radar-data";
import { buildAlerts } from "@/lib/strategic-plan/alerts";
import { serializePlanoSnapshot } from "@/lib/strategic-plan/snapshots";
import {
  pickObjetivoAtual,
  resolveObjetivoFase,
  shouldAutoConcluirObjetivo,
  faseToDbStatus,
  defaultPlanoTitulo,
  planoPeriodoLongo,
  isObjetivoAtivo,
  OBJETIVO_WORKFLOW_FASE,
} from "@/lib/strategic-plan/objetivo-workflow";
import { brtToday } from "@/lib/period";
import {
  PLANO_ACAO_SELECT,
  PLANO_APRENDIZADO_SELECT,
  PLANO_DECISAO_SELECT,
  PLANO_ESTRATEGIA_SELECT,
  PLANO_ESTRATEGICO_SELECT,
  PLANO_EVENTO_SELECT,
  PLANO_HIPOTESE_SELECT,
  PLANO_METRIC_REF_SELECT,
  PLANO_OBJETIVO_SELECT,
  PLANO_OPORTUNIDADE_SELECT,
  PLANO_ROADMAP_MARCO_SELECT,
  PLANO_ALINHAMENTO_SELECT,
} from "@/lib/strategic-plan/selects";
import { ESTRATEGIA_EDITORIAL_STATS_SELECT } from "@/lib/db-selects";
import type {
  AlinhamentoJourney,
  PlanoAlinhamento,
  QuizData,
  PlanData,
} from "@/lib/strategic-plan/types";
import { QUIZ_OBJETIVO_PRINCIPAL } from "@/lib/strategic-plan/types";

async function isAdmin(ctx: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }> };
  userId: string;
  claims?: { email?: string | null };
}) {
  const email = ctx.claims?.email ?? undefined;
  if (isPlatformOwnerEmail(email)) return true;
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  return !!data;
}

async function assertAdmin(ctx: Parameters<typeof isAdmin>[0]) {
  if (!(await isAdmin(ctx))) throw new Error("Forbidden: admin role required");
}

async function authorEmail(ctx: {
  supabase: {
    auth: { getUser: () => PromiseLike<{ data: { user: { email?: string | null } | null } }> };
  };
}) {
  const { data } = await ctx.supabase.auth.getUser();
  return data.user?.email ?? null;
}

async function recordEvent(
  ctx: { supabase: any; userId: string },
  input: {
    plano_id: string;
    tipo: (typeof PLANO_EVENTO_TIPO)[number];
    entity_type?: string;
    entity_id?: string;
    mensagem?: string;
    payload?: Record<string, unknown>;
  },
) {
  const email = await authorEmail(ctx);
  await ctx.supabase.from("plano_eventos").insert({
    plano_id: input.plano_id,
    tipo: input.tipo,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    mensagem: input.mensagem ?? null,
    payload: input.payload ?? null,
    autor_id: ctx.userId,
    autor_email: email,
  });
}

async function loadPlanoDetail(supabase: any, planoId: string): Promise<PlanoDetail> {
  const { data: plano, error: e0 } = await supabase
    .from("planos_estrategicos")
    .select(PLANO_ESTRATEGICO_SELECT)
    .eq("id", planoId)
    .maybeSingle();
  if (e0) throw new Error(e0.message);
  if (!plano) throw new Error("Plano não encontrado");

  const [
    { data: objetivos },
    { data: estrategias },
    { data: metricRefs },
    { data: hipoteses },
    { data: oportunidades },
    { data: decisoes },
    { data: aprendizados },
    { data: roadmap },
    { data: acoes },
    { data: eventos },
    { data: junctions },
  ] = await Promise.all([
    supabase
      .from("plano_objetivos")
      .select(PLANO_OBJETIVO_SELECT)
      .eq("plano_id", planoId)
      .order("ordem"),
    supabase
      .from("plano_estrategias")
      .select(PLANO_ESTRATEGIA_SELECT)
      .eq("plano_id", planoId)
      .order("ordem"),
    supabase.from("plano_metric_refs").select(PLANO_METRIC_REF_SELECT).eq("plano_id", planoId),
    supabase
      .from("plano_hipoteses")
      .select(PLANO_HIPOTESE_SELECT)
      .eq("plano_id", planoId)
      .order("ordem"),
    supabase
      .from("plano_oportunidades")
      .select(PLANO_OPORTUNIDADE_SELECT)
      .eq("plano_id", planoId)
      .order("ordem"),
    supabase
      .from("plano_decisoes")
      .select(PLANO_DECISAO_SELECT)
      .eq("plano_id", planoId)
      .order("data_decisao", { ascending: false }),
    supabase
      .from("plano_aprendizados")
      .select(PLANO_APRENDIZADO_SELECT)
      .eq("plano_id", planoId)
      .order("mes_referencia", { ascending: false }),
    supabase
      .from("plano_roadmap_marcos")
      .select(PLANO_ROADMAP_MARCO_SELECT)
      .eq("plano_id", planoId)
      .order("ordem"),
    supabase.from("plano_acoes").select(PLANO_ACAO_SELECT).eq("plano_id", planoId).order("ordem"),
    supabase
      .from("plano_eventos")
      .select(PLANO_EVENTO_SELECT)
      .eq("plano_id", planoId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("plano_objetivo_estrategias").select("objetivo_id, estrategia_id"),
  ]);

  const estrategiaIdsByObjetivo = new Map<string, string[]>();
  for (const j of junctions ?? []) {
    const arr = estrategiaIdsByObjetivo.get(j.objetivo_id) ?? [];
    arr.push(j.estrategia_id);
    estrategiaIdsByObjetivo.set(j.objetivo_id, arr);
  }

  const objetivosWithLinks = (objetivos ?? []).map((o: any) => ({
    ...o,
    estrategia_ids: estrategiaIdsByObjetivo.get(o.id) ?? [],
  }));

  return {
    plano,
    objetivos: objetivosWithLinks,
    estrategias: estrategias ?? [],
    metricRefs: metricRefs ?? [],
    hipoteses: hipoteses ?? [],
    oportunidades: oportunidades ?? [],
    decisoes: decisoes ?? [],
    aprendizados: aprendizados ?? [],
    roadmap: roadmap ?? [],
    acoes: acoes ?? [],
    eventos: eventos ?? [],
  };
}

function parseEditorialStats(
  rows: { estrategia_id: string; status: string; total: number }[],
): Record<string, EstrategiaEditorialStats> {
  const map: Record<string, EstrategiaEditorialStats> = {};
  for (const r of rows) {
    const cur = map[r.estrategia_id] ?? {
      estrategia_id: r.estrategia_id,
      total: 0,
      publicados: 0,
      aprovados: 0,
      aguardando: 0,
      em_producao: 0,
      rascunho: 0,
    };
    const n = Number(r.total);
    cur.total += n;
    if (r.status === "publicado") cur.publicados += n;
    else if (r.status === "aprovado") cur.aprovados += n;
    else if (r.status === "aguardando_aprovacao") cur.aguardando += n;
    else if (r.status === "producao" || r.status === "edicao" || r.status === "em_producao")
      cur.em_producao += n;
    else if (r.status === "rascunho") cur.rascunho += n;
    map[r.estrategia_id] = cur;
  }
  return map;
}

async function fetchPlatformRows(
  supabase: any,
  clienteNome: string,
  platformKeys: string[],
  prevFrom: string,
  to: string,
): Promise<Record<string, Row[]>> {
  const out: Record<string, Row[]> = {};
  await Promise.all(
    platformKeys.map(async (key) => {
      const def = getPlatformDef(key);
      if (!def) return;
      const { data, error } = await supabase
        .from(def.view)
        .select(platformViewSelect(def))
        .eq("cliente", clienteNome)
        .gte("data", prevFrom)
        .lte("data", to);
      if (error) throw new Error(error.message);
      out[key] = (data ?? []) as Row[];
    }),
  );
  return out;
}

async function syncObjectiveAutoComplete(
  supabase: any,
  objetivos: Array<{ id: string; progressPct: number | null; fase: string }>,
) {
  for (const o of objetivos) {
    if (o.fase === "concluido" || o.fase === "cancelado") continue;
    if (!shouldAutoConcluirObjetivo(o.progressPct)) continue;
    await supabase
      .from("plano_objetivos")
      .update({
        status: "concluido",
        workflow_fase: "concluido",
        progresso_manual: 100,
      })
      .eq("id", o.id);
  }
}

async function buildDashboard(supabase: any, planoId: string): Promise<StrategicDashboardPayload> {
  const detail = await loadPlanoDetail(supabase, planoId);
  const { plano } = detail;
  const period = resolvePeriod({
    preset: "custom",
    customFrom: plano.periodo_inicio,
    customTo: plano.periodo_fim,
  });

  const platformKeys = [
    ...new Set([
      ...detail.metricRefs.map((r) => r.platform_key),
      ...Object.keys(PLATFORM_REGISTRY),
    ]),
  ];

  const rowsByPlatform = await fetchPlatformRows(
    supabase,
    plano.cliente_nome,
    platformKeys,
    period.prevFrom,
    period.to,
  );

  const metricProgress = computeMetricProgress(detail.metricRefs, rowsByPlatform, period);

  const platformAggs: Record<string, ReturnType<typeof aggregatePeriod>> = {};
  for (const key of platformKeys) {
    const def = getPlatformDef(key);
    if (!def || !rowsByPlatform[key]?.length) continue;
    platformAggs[key] = aggregatePeriod(def, rowsByPlatform[key], period);
  }

  const diagnostico = buildDiagnostico(platformAggs);
  const regras = deriveOportunidadesRegra(platformAggs);
  const { merged: oportunidadesMerged, regraOnly } = mergeOportunidades(
    detail.oportunidades,
    regras,
  );

  const estrategiaIds = detail.estrategias.map((e) => e.id);
  let editorialStatsMap: Record<string, EstrategiaEditorialStats> = {};
  if (estrategiaIds.length > 0) {
    const { data: statsRows } = await supabase
      .from("vw_estrategia_editorial_stats")
      .select(ESTRATEGIA_EDITORIAL_STATS_SELECT);
    editorialStatsMap = parseEditorialStats(statsRows ?? []);
  }

  let objetivos = detail.objetivos.map((o) => {
    const objRefs = metricProgress.filter((m) => m.ref.objetivo_id === o.id);
    const linked = detail.estrategias.filter(
      (e) => e.objetivo_id === o.id || (o.estrategia_ids ?? []).includes(e.id),
    );
    const progressPct = objectiveProgressPct(objRefs, o.progresso_manual);
    const fase = resolveObjetivoFase({ ...o, progressPct });
    return {
      ...o,
      estrategias: linked,
      metricProgress: objRefs,
      progressPct,
      fase,
    };
  });

  await syncObjectiveAutoComplete(supabase, objetivos);
  objetivos = objetivos.map((o) =>
    shouldAutoConcluirObjetivo(o.progressPct) && o.fase !== "concluido"
      ? { ...o, fase: "concluido", progressPct: 100, status: "concluido" as const }
      : o,
  );

  const objetivoAtualBuilt = pickObjetivoAtual(objetivos);
  const scopeObjetivoId = objetivoAtualBuilt?.id ?? null;
  const estrategiasScoped = scopeObjetivoId
    ? detail.estrategias.filter((e) => e.objetivo_id === scopeObjetivoId)
    : detail.estrategias;

  const estrategias = estrategiasScoped.map((e) => ({
    ...e,
    editorialStats: editorialStatsMap[e.id] ?? {
      estrategia_id: e.id,
      total: 0,
      publicados: 0,
      aprovados: 0,
      aguardando: 0,
      em_producao: 0,
      rascunho: 0,
    },
  }));

  const alerts = buildAlerts({
    objetivos: detail.objetivos,
    estrategias: detail.estrategias,
    acoes: detail.acoes,
    metricProgress,
  });

  const proximosPassos = deriveProximosPassos({
    acoes: scopeObjetivoId
      ? detail.acoes.filter(
          (a) => !a.estrategia_id || estrategiasScoped.some((e) => e.id === a.estrategia_id),
        )
      : detail.acoes,
    oportunidades: oportunidadesMerged,
    hipoteses: scopeObjetivoId
      ? detail.hipoteses.filter((h) => h.objetivo_id === scopeObjetivoId || !h.objetivo_id)
      : detail.hipoteses,
    estrategias: estrategiasScoped,
    editorialStats: editorialStatsMap,
    metricProgress,
  });

  const radar = buildRadarAxes({ metricProgress, estrategias: estrategiasScoped });

  const ultimasDecisoes = detail.decisoes.slice(0, 5);
  const hipotesesScoped = scopeObjetivoId
    ? detail.hipoteses.filter((h) => h.objetivo_id === scopeObjetivoId)
    : detail.hipoteses;
  const roadmapScoped = scopeObjetivoId
    ? detail.roadmap.filter((r) => r.objetivo_id === scopeObjetivoId)
    : detail.roadmap;

  const proximaMeta =
    objetivoAtualBuilt?.metricProgress.find((m) => m.meta != null && !m.onTrack) ??
    objetivoAtualBuilt?.metricProgress.find((m) => m.meta != null) ??
    null;

  const hasAtivos = objetivos.some((o) =>
    isObjetivoAtivo(o.fase as (typeof OBJETIVO_WORKFLOW_FASE)[number]),
  );
  const allConcluidos =
    objetivos.length > 0 &&
    objetivos.every((o) => o.fase === "concluido" || o.fase === "cancelado");

  return {
    plano,
    objetivoAtual: objetivoAtualBuilt
      ? {
          ...objetivoAtualBuilt,
          proximaMeta,
        }
      : null,
    objetivos,
    estrategias,
    hipoteses: hipotesesScoped,
    oportunidades: oportunidadesMerged,
    oportunidadesRegra: regraOnly,
    decisoes: ultimasDecisoes,
    aprendizados: detail.aprendizados,
    roadmap: roadmapScoped,
    acoes: scopeObjetivoId
      ? detail.acoes.filter(
          (a) => !a.estrategia_id || estrategiasScoped.some((e) => e.id === a.estrategia_id),
        )
      : detail.acoes,
    eventos: detail.eventos,
    diagnostico,
    radar,
    metricProgress,
    alerts,
    proximosPassos,
    needsPrimeiroObjetivo: objetivos.length === 0,
    suggestProximoObjetivo: !hasAtivos && allConcluidos,
  };
}

// ---------- LIST ----------
export const listPlanos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int().optional(),
        status: z.enum(PLANO_STATUS).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("planos_estrategicos")
      .select(PLANO_ESTRATEGICO_SELECT)
      .order("updated_at", { ascending: false });
    if (data.cadastro_cliente_id) q = q.eq("cadastro_cliente_id", data.cadastro_cliente_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- GET PLANO FOR CLIENTE (único ativo) ----------
export const getPlanoForCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int().optional(),
        cliente_nome: z.string().trim().min(1).optional(),
      })
      .refine((v) => v.cadastro_cliente_id != null || v.cliente_nome != null, {
        message: "Informe cadastro_cliente_id ou cliente_nome",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("planos_estrategicos")
      .select(PLANO_ESTRATEGICO_SELECT)
      .eq("status", "ativo")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (data.cadastro_cliente_id) q = q.eq("cadastro_cliente_id", data.cadastro_cliente_id);
    if (data.cliente_nome) q = q.eq("cliente_nome", data.cliente_nome);
    const { data: row, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- ENSURE PLANO (cria se não existir) ----------
export const ensurePlanoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int(),
        titulo: z.string().trim().max(200).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("planos_estrategicos")
      .select(PLANO_ESTRATEGICO_SELECT)
      .eq("cadastro_cliente_id", data.cadastro_cliente_id)
      .eq("status", "ativo")
      .maybeSingle();

    if (existing) return { plano: existing, created: false };

    const { data: cli, error: e0 } = await context.supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!cli) throw new Error("Cliente não encontrado");

    const today = brtToday();
    const periodo = planoPeriodoLongo(today);
    const titulo = data.titulo?.trim() || defaultPlanoTitulo(cli.nome_cliente);

    const { data: row, error } = await context.supabase
      .from("planos_estrategicos")
      .insert({
        cadastro_cliente_id: data.cadastro_cliente_id,
        cliente_nome: cli.nome_cliente,
        titulo,
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
        status: "ativo",
        created_by: context.userId,
      })
      .select(PLANO_ESTRATEGICO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id: row.id,
      tipo: "criacao",
      mensagem: "Plano estratégico iniciado",
    });
    return { plano: row, created: true };
  });

// ---------- GET PLANO ----------
export const getPlano = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => loadPlanoDetail(context.supabase, data.id));

// ---------- STRATEGIC DASHBOARD ----------
export const getStrategicDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => buildDashboard(context.supabase, data.id));

// ---------- CREATE PLANO (admin — um ativo por cliente) ----------
const planoCreate = z.object({
  cadastro_cliente_id: z.number().int(),
  titulo: z.string().trim().max(200).optional().nullable(),
  descricao: z.string().trim().max(5000).optional().nullable(),
  periodo_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  periodo_fim: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(PLANO_STATUS).default("ativo"),
  objetivo_principal: z.string().trim().max(2000).optional().nullable(),
  observacoes: z.string().trim().max(5000).optional().nullable(),
});

export const createPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planoCreate.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: existing } = await context.supabase
      .from("planos_estrategicos")
      .select("id")
      .eq("cadastro_cliente_id", data.cadastro_cliente_id)
      .eq("status", "ativo")
      .maybeSingle();
    if (existing) {
      throw new Error("Este cliente já possui um Plano Estratégico ativo.");
    }

    const { data: cli, error: e0 } = await context.supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!cli) throw new Error("Cliente não encontrado");

    const today = brtToday();
    const periodo = planoPeriodoLongo(today);
    const titulo = data.titulo?.trim() || defaultPlanoTitulo(cli.nome_cliente);

    const { data: row, error } = await context.supabase
      .from("planos_estrategicos")
      .insert({
        cadastro_cliente_id: data.cadastro_cliente_id,
        cliente_nome: cli.nome_cliente,
        titulo,
        descricao: data.descricao ?? null,
        periodo_inicio: data.periodo_inicio ?? periodo.inicio,
        periodo_fim: data.periodo_fim ?? periodo.fim,
        status: data.status ?? "ativo",
        objetivo_principal: data.objetivo_principal ?? null,
        observacoes: data.observacoes ?? null,
        created_by: context.userId,
      })
      .select(PLANO_ESTRATEGICO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, { plano_id: row.id, tipo: "criacao", mensagem: "Plano criado" });
    return row;
  });

// ---------- UPDATE PLANO ----------
export const updatePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid() })
      .merge(planoCreate.partial().omit({ cadastro_cliente_id: true }))
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const detail = await loadPlanoDetail(context.supabase, id);
    await context.supabase.from("plano_snapshots").insert({
      plano_id: id,
      snapshot: serializePlanoSnapshot(detail),
      created_by: context.userId,
    });
    const { data: row, error } = await context.supabase
      .from("planos_estrategicos")
      .update(patch)
      .eq("id", id)
      .select(PLANO_ESTRATEGICO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id: id,
      tipo: "edicao",
      entity_type: "plano",
      entity_id: id,
    });
    return row;
  });

// ---------- UPSERT OBJETIVO ----------
export const upsertObjetivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        meta_numerica: z.number().optional().nullable(),
        data_alvo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        periodo_inicio: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        workflow_fase: z.enum(OBJETIVO_WORKFLOW_FASE).optional(),
        progresso_manual: z.number().min(0).max(100).optional().nullable(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        ordem: z.number().int().optional(),
        estrategia_ids: z.array(z.string().uuid()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { estrategia_ids, id, plano_id, workflow_fase, ...fields } = data;
    const payload = {
      ...fields,
      ...(workflow_fase
        ? {
            workflow_fase,
            status: faseToDbStatus(workflow_fase),
          }
        : {}),
    };
    if (
      workflow_fase === "concluido" ||
      (payload.progresso_manual != null && payload.progresso_manual >= 100)
    ) {
      payload.status = "concluido";
      payload.workflow_fase = "concluido";
      payload.progresso_manual = 100;
    }
    if (!payload.periodo_inicio && !id) {
      payload.periodo_inicio = brtToday();
    }
    let row;
    if (id) {
      const { data: updated, error } = await context.supabase
        .from("plano_objetivos")
        .update(payload)
        .eq("id", id)
        .select(PLANO_OBJETIVO_SELECT)
        .single();
      if (error) throw new Error(error.message);
      row = updated;
      await recordEvent(context, {
        plano_id,
        tipo: fields.meta_numerica != null ? "mudanca_meta" : "edicao",
        entity_type: "objetivo",
        entity_id: id,
      });
    } else {
      const { data: inserted, error } = await context.supabase
        .from("plano_objetivos")
        .insert({
          ...payload,
          plano_id,
          workflow_fase: payload.workflow_fase ?? "planejamento",
          status: payload.status ?? "pendente",
        })
        .select(PLANO_OBJETIVO_SELECT)
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
      await recordEvent(context, {
        plano_id,
        tipo: "criacao",
        entity_type: "objetivo",
        entity_id: row.id,
      });
    }
    if (estrategia_ids) {
      await context.supabase.from("plano_objetivo_estrategias").delete().eq("objetivo_id", row.id);
      if (estrategia_ids.length > 0) {
        await context.supabase
          .from("plano_objetivo_estrategias")
          .insert(estrategia_ids.map((estrategia_id) => ({ objetivo_id: row.id, estrategia_id })));
      }
    }
    return row;
  });

// ---------- UPSERT ESTRATEGIA ----------
export const upsertEstrategia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        objetivo_id: z.string().uuid().optional().nullable(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        prioridade: z.enum(PLANO_PRIORIDADE).optional(),
        peso_percentual: z.number().min(0).max(100).optional(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        responsavel_email: z.string().trim().email().optional().nullable().or(z.literal("")),
        data_prevista: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        comentarios: z.string().trim().max(2000).optional().nullable(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, objetivo_id, responsavel_email, ...fields } = data;
    const payload = {
      ...fields,
      objetivo_id: objetivo_id ?? null,
      responsavel_email: responsavel_email || null,
    };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_estrategias")
        .update(payload)
        .eq("id", id)
        .select(PLANO_ESTRATEGIA_SELECT)
        .single();
      if (error) throw new Error(error.message);
      if (objetivo_id) {
        await context.supabase
          .from("plano_objetivo_estrategias")
          .upsert({ objetivo_id, estrategia_id: id }, { onConflict: "objetivo_id,estrategia_id" });
      }
      await recordEvent(context, {
        plano_id,
        tipo: "edicao",
        entity_type: "estrategia",
        entity_id: id,
        payload: fields.peso_percentual != null ? { peso: fields.peso_percentual } : undefined,
      });
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_estrategias")
      .insert({ ...payload, plano_id })
      .select(PLANO_ESTRATEGIA_SELECT)
      .single();
    if (error) throw new Error(error.message);
    if (objetivo_id) {
      await context.supabase
        .from("plano_objetivo_estrategias")
        .upsert(
          { objetivo_id, estrategia_id: row.id },
          { onConflict: "objetivo_id,estrategia_id" },
        );
    }
    await recordEvent(context, {
      plano_id,
      tipo: "criacao",
      entity_type: "estrategia",
      entity_id: row.id,
    });
    return row;
  });

// ---------- UPSERT METRIC REF ----------
export const upsertMetricRef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        objetivo_id: z.string().uuid().optional().nullable(),
        platform_key: z.string().trim().min(1),
        metric_key: z.string().trim().optional().nullable(),
        kpi_key: z.string().trim().optional().nullable(),
        meta_numerica: z.number().optional().nullable(),
        positive_is_good: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!validateMetricRef(data.platform_key, data.metric_key ?? null, data.kpi_key ?? null)) {
      throw new Error("Referência de métrica inválida");
    }
    const { id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_metric_refs")
        .update(fields)
        .eq("id", id)
        .select(PLANO_METRIC_REF_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_metric_refs")
      .insert(fields)
      .select(PLANO_METRIC_REF_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT ACAO ----------
export const upsertAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        estrategia_id: z.string().uuid().optional().nullable(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        motivo_estrategico: z.string().trim().min(1).max(2000),
        responsavel_email: z.string().trim().email().optional().nullable().or(z.literal("")),
        data_prevista: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        sugerido: z.boolean().optional(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, responsavel_email, ...fields } = data;
    const payload = { ...fields, responsavel_email: responsavel_email || null };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_acoes")
        .update(payload)
        .eq("id", id)
        .select(PLANO_ACAO_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_acoes")
      .insert({ ...payload, plano_id })
      .select(PLANO_ACAO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT HIPOTESE ----------
export const upsertHipotese = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        objetivo_id: z.string().uuid().optional().nullable(),
        estrategia_id: z.string().uuid().optional().nullable(),
        hipotese: z.string().trim().min(1).max(2000),
        status: z.enum(HIPOTESE_STATUS).optional(),
        resultado_percentual: z.number().optional().nullable(),
        resultado_texto: z.string().trim().max(2000).optional().nullable(),
        conclusao: z.string().trim().max(2000).optional().nullable(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_hipoteses")
        .update(fields)
        .eq("id", id)
        .select(PLANO_HIPOTESE_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_hipoteses")
      .insert({ ...fields, plano_id })
      .select(PLANO_HIPOTESE_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT OPORTUNIDADE ----------
export const upsertOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        platform_key: z.string().trim().optional().nullable(),
        insight: z.string().trim().min(1).max(500),
        acao_sugerida: z.string().trim().min(1).max(500),
        origem: z.enum(OPORTUNIDADE_ORIGEM).optional(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_oportunidades")
        .update(fields)
        .eq("id", id)
        .select(PLANO_OPORTUNIDADE_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_oportunidades")
      .insert({ ...fields, plano_id, origem: fields.origem ?? "manual" })
      .select(PLANO_OPORTUNIDADE_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- UPSERT DECISAO ----------
export const upsertDecisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        estrategia_id: z.string().uuid().optional().nullable(),
        titulo: z.string().trim().min(1).max(200),
        motivo: z.string().trim().min(1).max(2000),
        responsavel_email: z.string().trim().email().optional().nullable().or(z.literal("")),
        resultado_texto: z.string().trim().max(2000).optional().nullable(),
        resultado_status: z.enum(DECISAO_RESULTADO_STATUS).optional(),
        data_decisao: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, responsavel_email, ...fields } = data;
    const payload = { ...fields, responsavel_email: responsavel_email || null };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_decisoes")
        .update(payload)
        .eq("id", id)
        .select(PLANO_DECISAO_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_decisoes")
      .insert({ ...payload, plano_id })
      .select(PLANO_DECISAO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id,
      tipo: "decisao",
      entity_type: "decisao",
      entity_id: row.id,
      mensagem: row.titulo,
    });
    return row;
  });

// ---------- UPSERT APRENDIZADO ----------
export const upsertAprendizado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        mes_referencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        tags: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, tags, ...fields } = data;
    const payload = { ...fields, tags: tags ?? [] };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_aprendizados")
        .update(payload)
        .eq("id", id)
        .select(PLANO_APRENDIZADO_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_aprendizados")
      .insert({ ...payload, plano_id })
      .select(PLANO_APRENDIZADO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id,
      tipo: "aprendizado",
      entity_type: "aprendizado",
      entity_id: row.id,
      mensagem: row.titulo,
    });
    return row;
  });

// ---------- UPSERT ROADMAP ----------
export const upsertRoadmapMarco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        plano_id: z.string().uuid(),
        objetivo_id: z.string().uuid().optional().nullable(),
        titulo: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().nullable(),
        tipo: z.enum(ROADMAP_MARCO_TIPO).optional(),
        semana_numero: z.number().int().optional().nullable(),
        data_prevista: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        status: z.enum(PLANO_ITEM_STATUS).optional(),
        ordem: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, plano_id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("plano_roadmap_marcos")
        .update(fields)
        .eq("id", id)
        .select(PLANO_ROADMAP_MARCO_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("plano_roadmap_marcos")
      .insert({ ...fields, plano_id })
      .select(PLANO_ROADMAP_MARCO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- COMMENT ----------
export const addPlanoComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ plano_id: z.string().uuid(), mensagem: z.string().trim().min(1).max(2000) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await recordEvent(context, {
      plano_id: data.plano_id,
      tipo: "comentario",
      mensagem: data.mensagem,
    });
    return { ok: true };
  });

const PLANO_ENTITY_TABLE = {
  objetivo: "plano_objetivos",
  estrategia: "plano_estrategias",
  hipotese: "plano_hipoteses",
  decisao: "plano_decisoes",
  acao: "plano_acoes",
  metric_ref: "plano_metric_refs",
  oportunidade: "plano_oportunidades",
  aprendizado: "plano_aprendizados",
  roadmap_marco: "plano_roadmap_marcos",
} as const;

type PlanoDeleteEntity = keyof typeof PLANO_ENTITY_TABLE;

// ---------- DELETE PLANO (admin) ----------
export const deletePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("planos_estrategicos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- ARCHIVE PLANO (admin) ----------
export const archivePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("planos_estrategicos")
      .update({ status: "arquivado" })
      .eq("id", data.id)
      .select(PLANO_ESTRATEGICO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id: data.id,
      tipo: "edicao",
      entity_type: "plano",
      entity_id: data.id,
      mensagem: "Plano arquivado",
    });
    return row;
  });

// ---------- DELETE PLANO ENTITY ----------
export const deletePlanoEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        plano_id: z.string().uuid(),
        entity: z.enum(
          Object.keys(PLANO_ENTITY_TABLE) as [PlanoDeleteEntity, ...PlanoDeleteEntity[]],
        ),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const table = PLANO_ENTITY_TABLE[data.entity];
    const { error } = await context.supabase
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("plano_id", data.plano_id);
    if (error) throw new Error(error.message);
    await recordEvent(context, {
      plano_id: data.plano_id,
      tipo: "edicao",
      entity_type: data.entity,
      entity_id: data.id,
      mensagem: "Registro excluído",
    });
    return { ok: true as const };
  });

// ---------- LIST ESTRATEGIAS FOR CLIENT (editorial picker) ----------
export const listEstrategiasForCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cadastro_cliente_id: number }) =>
    z.object({ cadastro_cliente_id: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: planos } = await context.supabase
      .from("planos_estrategicos")
      .select("id")
      .eq("cadastro_cliente_id", data.cadastro_cliente_id)
      .in("status", ["ativo", "rascunho"]);
    const ids = (planos ?? []).map((p: { id: string }) => p.id);
    if (ids.length === 0) return [];
    const { data: rows, error } = await context.supabase
      .from("plano_estrategias")
      .select("id, titulo, plano_id, status")
      .in("plano_id", ids)
      .order("ordem");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- ALINHAMENTO ESTRATÉGICO (quiz → pending → active) ----------

const quizDataSchema = z.object({
  momentoNegocio: z.string().trim().min(20).max(2000),
  objetivoPrincipal: z.enum(QUIZ_OBJETIVO_PRINCIPAL),
  temSite: z.boolean(),
  temDominio: z.boolean(),
  investeTrafego: z.boolean(),
  posicionamentoRedes: z.string().trim().min(10).max(2000),
  verbaAdsMensal: z.string().trim().min(1).max(120),
  cienteCustosInfra: z.literal(true),
});

const planDataSchema = z.object({
  resumoEstrategia: z.string().trim().min(20).max(5000),
  feeAgencia: z.number().nonnegative(),
  verbaTrafego: z.number().nonnegative(),
  custosInfra: z.number().nonnegative(),
  itensEntrega: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
});

function toAlinhamentoJourney(
  row: PlanoAlinhamento | null,
  legadoPlanoId: string | null,
): AlinhamentoJourney {
  const hasCompletedQuiz = !!row?.quiz_completed_at;
  const hasActivePlan = !!row?.has_active_plan && !!row?.plan_data;
  let uiState: AlinhamentoJourney["uiState"] = "quiz";
  if (hasActivePlan) uiState = "active";
  else if (hasCompletedQuiz) uiState = "pending";

  return {
    hasCompletedQuiz,
    quizData: (row?.quiz_data as QuizData | null) ?? null,
    hasActivePlan,
    planData: (row?.plan_data as PlanData | null) ?? null,
    planApprovedAt: row?.plan_approved_at ?? null,
    alinhamento: row,
    uiState,
    legadoPlanoId,
  };
}

export const getAlinhamentoJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int(),
        cliente_nome: z.string().trim().min(1).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ data: row, error }, { data: legado }] = await Promise.all([
      context.supabase
        .from("plano_alinhamentos")
        .select(PLANO_ALINHAMENTO_SELECT)
        .eq("cadastro_cliente_id", data.cadastro_cliente_id)
        .maybeSingle(),
      context.supabase
        .from("planos_estrategicos")
        .select("id")
        .eq("cadastro_cliente_id", data.cadastro_cliente_id)
        .eq("status", "ativo")
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);

    const journey = toAlinhamentoJourney(
      (row as PlanoAlinhamento | null) ?? null,
      legado?.id ?? null,
    );

    // Clientes legados: já têm Centro ativo, sem quiz — preserva acesso ao operacional.
    if (!journey.hasCompletedQuiz && journey.legadoPlanoId) {
      return { ...journey, uiState: "active" as const, hasActivePlan: true };
    }

    return journey;
  });

export const submitAlinhamentoQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int(),
        quiz_data: quizDataSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: cli, error: e0 } = await context.supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!cli) throw new Error("Cliente não encontrado");

    const { data: existing, error: e1 } = await context.supabase
      .from("plano_alinhamentos")
      .select(PLANO_ALINHAMENTO_SELECT)
      .eq("cadastro_cliente_id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);

    if (existing?.has_active_plan) {
      throw new Error("Este cliente já possui um plano estratégico ativo.");
    }
    if (existing?.quiz_completed_at) {
      throw new Error("O alinhamento já foi enviado. Aguarde a proposta da equipe.");
    }

    const now = new Date().toISOString();
    const payload = {
      cadastro_cliente_id: data.cadastro_cliente_id,
      cliente_nome: cli.nome_cliente as string,
      quiz_completed_at: now,
      quiz_data: data.quiz_data,
      has_active_plan: false,
      plan_data: null,
      updated_at: now,
    };

    if (existing) {
      const { data: row, error } = await context.supabase
        .from("plano_alinhamentos")
        .update(payload)
        .eq("id", existing.id)
        .select(PLANO_ALINHAMENTO_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return toAlinhamentoJourney(row as PlanoAlinhamento, null);
    }

    const { data: row, error } = await context.supabase
      .from("plano_alinhamentos")
      .insert(payload)
      .select(PLANO_ALINHAMENTO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toAlinhamentoJourney(row as PlanoAlinhamento, null);
  });

export const publishAlinhamentoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int(),
        plan_data: planDataSchema,
        link_plano_operacional: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: existing, error: e0 } = await context.supabase
      .from("plano_alinhamentos")
      .select(PLANO_ALINHAMENTO_SELECT)
      .eq("cadastro_cliente_id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!existing?.quiz_completed_at) {
      throw new Error("O cliente ainda não enviou o alinhamento.");
    }

    let planoId = existing.plano_id as string | null;
    if (data.link_plano_operacional !== false && !planoId) {
      const { data: existingPlano } = await context.supabase
        .from("planos_estrategicos")
        .select(PLANO_ESTRATEGICO_SELECT)
        .eq("cadastro_cliente_id", data.cadastro_cliente_id)
        .eq("status", "ativo")
        .maybeSingle();
      if (existingPlano?.id) {
        planoId = existingPlano.id;
      } else {
        const { data: cli } = await context.supabase
          .from("cadastro_clientes")
          .select("nome_cliente")
          .eq("id", data.cadastro_cliente_id)
          .maybeSingle();
        const today = brtToday();
        const periodo = planoPeriodoLongo(today);
        const { data: created, error: createErr } = await context.supabase
          .from("planos_estrategicos")
          .insert({
            cadastro_cliente_id: data.cadastro_cliente_id,
            cliente_nome: cli?.nome_cliente ?? existing.cliente_nome,
            titulo: defaultPlanoTitulo(cli?.nome_cliente ?? existing.cliente_nome),
            periodo_inicio: periodo.inicio,
            periodo_fim: periodo.fim,
            status: "ativo",
            objetivo_principal: data.plan_data.resumoEstrategia.slice(0, 500),
            created_by: context.userId,
          })
          .select("id")
          .single();
        if (createErr) throw new Error(createErr.message);
        planoId = created.id;
        await recordEvent(context, {
          plano_id: created.id,
          tipo: "criacao",
          mensagem: "Plano estratégico criado a partir do alinhamento",
        });
      }
    }

    const now = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("plano_alinhamentos")
      .update({
        has_active_plan: true,
        plan_data: data.plan_data,
        plano_id: planoId,
        plan_approved_at: null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select(PLANO_ALINHAMENTO_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toAlinhamentoJourney(row as PlanoAlinhamento, planoId);
  });

export const approveAlinhamentoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastro_cliente_id: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: e0 } = await context.supabase
      .from("plano_alinhamentos")
      .select(PLANO_ALINHAMENTO_SELECT)
      .eq("cadastro_cliente_id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!existing?.has_active_plan || !existing.plan_data) {
      throw new Error("Não há plano ativo para aprovar.");
    }
    if (existing.plan_approved_at) {
      return toAlinhamentoJourney(existing as PlanoAlinhamento, existing.plano_id);
    }

    const now = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("plano_alinhamentos")
      .update({ plan_approved_at: now, updated_at: now })
      .eq("id", existing.id)
      .select(PLANO_ALINHAMENTO_SELECT)
      .single();
    if (error) throw new Error(error.message);

    if (existing.plano_id) {
      await recordEvent(context, {
        plano_id: existing.plano_id,
        tipo: "decisao",
        mensagem: "Cliente aprovou o Plano Estratégico / escopo comercial",
      });
    }

    return toAlinhamentoJourney(row as PlanoAlinhamento, existing.plano_id);
  });
