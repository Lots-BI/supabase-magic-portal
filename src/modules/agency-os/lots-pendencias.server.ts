import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { loadCallerAccess } from "@/modules/access/organization.server";
import { getClientAccessScope } from "@/modules/approval/internal/client-access.server";
import { slugify } from "@/lib/slug";
import { aggregateByCliente, pctDelta, periodRange } from "@/lib/metrics";
import { isTaskSheetAba, taskAbaHref, todayInSaoPaulo } from "./tasks-sheet";
import {
  buildLotsPendencias,
  DONO_CONTEUDO_EMAIL,
  DONO_OPERACAO_EMAIL,
  type PendenciaCard,
  type PendenciaCliente,
  type PendenciaConexao,
  type PendenciaDono,
  type PendenciaDraft,
  type PendenciaPessoa,
} from "./lots-pendencias";

export type LotsPendenciaRow = PendenciaDraft & {
  concluidaEm: string | null;
  repete: string | null;
  logId: string | null;
};

const ATIVOS = [
  "roteiro",
  "alteracoes_roteiro",
  "aguardando_material",
  "producao",
  "alteracoes_design",
  "aguardando_aprovacao",
  "aguardando_aprovacao_final",
  "agendado",
  "publicado",
];

function permalinkDe(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const link = (metadata as { permalink?: unknown }).permalink;
  return typeof link === "string" && link.startsWith("http") ? link : null;
}

function wants(flag: string | null | undefined): boolean {
  if (!flag) return false;
  const value = flag.trim().toLowerCase();
  return (
    value !== "" &&
    value !== "off" &&
    value !== "false" &&
    value !== "0" &&
    value !== "nao" &&
    value !== "não"
  );
}

function missingTable(message: string): boolean {
  return (
    /lots_pendencias/i.test(message) && /does not exist|schema cache|could not find/i.test(message)
  );
}

async function loadDrafts(): Promise<PendenciaDraft[]> {
  const admin = getSupabaseAdmin();
  const today = todayInSaoPaulo();
  const [clientesRes, cardsRes, conexoesRes, pessoasRes, diretrizesRes, acessoRes] =
    await Promise.all([
      admin
        .from("cadastro_clientes")
        .select(
          "id, nome_cliente, slug, ativo, data_inicio, responsavel_user_id, instagram_ativo, tiktok_ativo, meta_ativo, google_ads_ativo, ga4_ativo, google_business_ativo",
        )
        .eq("ativo", true),
      admin
        .from("content_cards")
        .select(
          "id, status, titulo, cadastro_cliente_id, cliente_nome, data_publicacao, checklist, responsavel_user_id, responsavel_email, publish_error, publish_status, updated_at, published_at, publish_attempted_at, external_post_id, integration_metadata",
        )
        .in("status", ATIVOS),
      admin
        .from("ph_connections")
        .select(
          "id, cadastro_id, plugin_key, health_status, status, last_sync_at, token_expires_at, last_error",
        ),
      admin
        .from("vw_crm_people_list")
        .select(
          "id, cadastro_cliente_id, display_name, cliente_slug, last_kind, ignored_at, churn_state, intent_score",
        )
        .limit(500),
      admin.from("cliente_diretrizes").select("cadastro_cliente_id"),
      admin.from("client_access").select("user_id, cadastro_cliente_id, cliente_nome"),
    ]);
  for (const result of [clientesRes, cardsRes, conexoesRes, diretrizesRes, acessoRes]) {
    if (result.error) throw new Error(result.error.message);
  }

  const clientes: PendenciaCliente[] = (clientesRes.data ?? []).map((row) => ({
    id: row.id,
    nome: row.nome_cliente,
    slug: row.slug || slugify(row.nome_cliente),
    ativo: row.ativo !== false,
    dataInicio: row.data_inicio,
    responsavelUserId: row.responsavel_user_id,
    instagramAtivo: row.instagram_ativo === true,
    tiktokAtivo: row.tiktok_ativo === true,
    metaAtivo: wants(row.meta_ativo),
    googleAdsAtivo: wants(row.google_ads_ativo),
    ga4Ativo: wants(row.ga4_ativo),
    googleBusinessAtivo: wants(row.google_business_ativo),
  }));
  const porId = new Map(clientes.map((cliente) => [cliente.id, cliente]));
  const cards: PendenciaCard[] = (cardsRes.data ?? []).map((row) => {
    const cliente = porId.get(row.cadastro_cliente_id);
    return {
      id: row.id,
      status: row.status,
      titulo: row.titulo,
      cadastroClienteId: row.cadastro_cliente_id,
      clienteNome: row.cliente_nome,
      slug: cliente?.slug || slugify(row.cliente_nome),
      dataPublicacao: row.data_publicacao,
      checklist: row.checklist,
      responsavelUserId: row.responsavel_user_id,
      responsavelEmail: row.responsavel_email,
      publishError: row.publish_error,
      publishStatus: row.publish_status,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
      publishAttemptedAt: row.publish_attempted_at,
      permalink: permalinkDe(row.integration_metadata),
    };
  });
  const conexoes: PendenciaConexao[] = (conexoesRes.data ?? [])
    .filter((row) => row.cadastro_id != null)
    .map((row) => ({
      id: row.id,
      cadastroId: row.cadastro_id as number,
      pluginKey: row.plugin_key,
      healthStatus: row.health_status,
      status: row.status,
      lastSyncAt: row.last_sync_at,
      tokenExpiresAt: row.token_expires_at,
      needsReauth: /login|token|expir|reauth|sess[aã]o/i.test(String(row.last_error ?? "")),
    }));
  const pessoas: PendenciaPessoa[] = pessoasRes.error
    ? []
    : (pessoasRes.data ?? [])
        .filter((row) => row.id && row.cadastro_cliente_id)
        .map((row) => ({
          id: row.id as string,
          cadastroClienteId: row.cadastro_cliente_id as number,
          nome: row.display_name?.trim() || "Pessoa",
          slug: row.cliente_slug || porId.get(row.cadastro_cliente_id as number)?.slug || "",
          lastKind: row.last_kind,
          ignoredAt: row.ignored_at,
          churnState: row.churn_state,
          intentScore: row.intent_score,
        }));

  const userIds = [
    ...new Set(
      [
        ...clientes.map((cliente) => cliente.responsavelUserId),
        ...(acessoRes.data ?? []).map((row) => row.user_id),
        ...cards.map((card) => card.responsavelUserId),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const usuarioNome = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nome, email")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      usuarioNome.set(profile.id, profile.nome?.trim() || profile.email?.trim() || "Usuário");
    }
  }
  const clienteUsuario = new Map<number, { userId: string; nome: string }>();
  for (const acesso of acessoRes.data ?? []) {
    if (acesso.cadastro_cliente_id == null || clienteUsuario.has(acesso.cadastro_cliente_id))
      continue;
    clienteUsuario.set(acesso.cadastro_cliente_id, {
      userId: acesso.user_id,
      nome: usuarioNome.get(acesso.user_id) || "Cliente",
    });
  }

  const { data: donosRes } = await admin
    .from("profiles")
    .select("id, nome, email")
    .in("email", [DONO_CONTEUDO_EMAIL, DONO_OPERACAO_EMAIL]);
  const donosPorEmail = new Map<string, PendenciaDono>();
  for (const profile of donosRes ?? []) {
    const email = profile.email?.trim().toLowerCase();
    if (!email) continue;
    donosPorEmail.set(email, {
      userId: profile.id,
      nome: profile.nome?.trim() || email,
    });
  }

  const pedidosRes = await admin
    .from("organization_applications")
    .select("user_id, full_name, created_at")
    .eq("status", "pending");
  const pedidos = pedidosRes.error
    ? []
    : (pedidosRes.data ?? []).map((row) => ({
        id: row.user_id,
        nome: row.full_name?.trim() || "Acesso",
        criadoEm: row.created_at,
      }));

  const relatorio = await carregarSinaisRelatorio(admin, clientes);

  return buildLotsPendencias({
    today,
    cards,
    clientes,
    conexoes,
    pessoas,
    diretrizesIds: new Set((diretrizesRes.data ?? []).map((row) => row.cadastro_cliente_id)),
    clienteUsuario,
    usuarioNome,
    donosPorEmail,
    pedidos,
    analisesEnviadas: relatorio.analisesEnviadas,
    quedas: relatorio.quedas,
  });
}

async function carregarSinaisRelatorio(
  admin: ReturnType<typeof getSupabaseAdmin>,
  clientes: PendenciaCliente[],
): Promise<{
  analisesEnviadas: Set<string> | undefined;
  quedas: {
    cadastroClienteId: number;
    periodoInicio: string;
    periodoFim: string;
    registrada: boolean;
  }[];
}> {
  const analisesRes = await admin
    .from("relatorio_analises")
    .select("cadastro_cliente_id, semana, enviada_em")
    .not("enviada_em", "is", null);
  const analisesEnviadas = analisesRes.error
    ? undefined
    : new Set(
        (analisesRes.data ?? []).map(
          (row) => `${row.cadastro_cliente_id}:${String(row.semana).slice(0, 10)}`,
        ),
      );
  const period = periodRange(30);
  const ocorrenciasRes = await admin
    .from("relatorio_ocorrencias")
    .select("cadastro_cliente_id, periodo_inicio, enviada_em")
    .not("enviada_em", "is", null);
  const registradas = new Set(
    (ocorrenciasRes.data ?? []).map(
      (row) => `${row.cadastro_cliente_id}:${String(row.periodo_inicio).slice(0, 10)}`,
    ),
  );
  const overviewRes = await admin.rpc("portfolio_overview", {
    p_from: period.prevFrom,
    p_to: period.to,
  });
  if (overviewRes.error) return { analisesEnviadas, quedas: [] };
  const rows = ((overviewRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    data: String(row.data).slice(0, 10),
    cliente: String(row.cliente),
    meta_spend: Number(row.meta_spend) || 0,
    google_spend: Number(row.google_spend) || 0,
    total_impressions: Number(row.total_impressions) || 0,
    total_clicks: Number(row.total_clicks) || 0,
    ga4_sessions: Number(row.ga4_sessions) || 0,
    ga4_conversions: Number(row.ga4_conversions) || 0,
    instagram_reach: Number(row.instagram_reach) || 0,
    instagram_interactions: Number(row.instagram_interactions) || 0,
    meta_results: Number(row.meta_results) || 0,
    meta_conversions: Number(row.meta_conversions) || 0,
    google_conversions: Number(row.google_conversions) || 0,
  }));
  const atual = aggregateByCliente(
    rows.filter((row) => row.data >= period.from && row.data <= period.to),
  );
  const anterior = new Map(
    aggregateByCliente(
      rows.filter((row) => row.data >= period.prevFrom && row.data <= period.prevTo),
    ).map((item) => [item.cliente, item]),
  );
  const porNome = new Map(
    clientes.map((cliente) => [cliente.nome.trim().toLowerCase(), cliente.id]),
  );
  const quedas = atual.flatMap((item) => {
    const prev = anterior.get(item.cliente);
    const delta = prev ? pctDelta(item.cpa, prev.cpa) : null;
    if (delta == null || delta < 40 || item.cpa <= 0) return [];
    const cadastroClienteId = porNome.get(item.cliente.trim().toLowerCase());
    if (!cadastroClienteId) return [];
    return [
      {
        cadastroClienteId,
        periodoInicio: period.from,
        periodoFim: period.to,
        registrada: registradas.has(`${cadastroClienteId}:${period.from}`),
      },
    ];
  });
  return { analisesEnviadas, quedas };
}

export async function syncLotsPendencias(): Promise<void> {
  const admin = getSupabaseAdmin();
  const drafts = await loadDrafts();
  const desejadas = new Set(drafts.map((item) => item.chave));
  const { data: abertas, error } = await admin
    .from("lots_pendencias")
    .select(
      "chave, titulo, cadastro_cliente_id, cliente_nome, responsavel_user_id, responsavel_nome, entrega, aba, lado, href, repete, editada, mantida",
    )
    .is("concluida_em", null);
  if (error) {
    if (missingTable(error.message)) return;
    throw new Error(error.message);
  }
  const fechar = (abertas ?? []).filter((row) => !desejadas.has(row.chave) && !row.mantida);
  if (fechar.length > 0) {
    const agora = new Date().toISOString();
    const { error: logError } = await admin.from("lots_pendencia_log").insert(
      fechar.map((row) => ({
        chave: row.chave,
        titulo: row.titulo,
        cadastro_cliente_id: row.cadastro_cliente_id,
        cliente_nome: row.cliente_nome,
        responsavel_user_id: row.responsavel_user_id,
        responsavel_nome: row.responsavel_nome,
        entrega: row.entrega,
        repete: row.repete,
        aba: row.aba,
        lado: row.lado,
        href: row.href,
        concluida_em: agora,
      })),
    );
    if (logError) throw new Error(logError.message);
    const { error: deleteError } = await admin
      .from("lots_pendencias")
      .delete()
      .in(
        "chave",
        fechar.map((row) => row.chave),
      );
    if (deleteError) throw new Error(deleteError.message);
  }
  const { data: pausas, error: pausaError } = await admin
    .from("lots_pendencia_pausa")
    .select("chave");
  if (pausaError && !missingTable(pausaError.message)) throw new Error(pausaError.message);
  const pausadas = new Set((pausas ?? []).map((row) => row.chave as string));
  const liberar = [...pausadas].filter((chave) => !desejadas.has(chave));
  if (liberar.length > 0) {
    const { error: liberaError } = await admin
      .from("lots_pendencia_pausa")
      .delete()
      .in("chave", liberar);
    if (liberaError) throw new Error(liberaError.message);
  }
  const soltar = (abertas ?? []).filter((row) => row.mantida && desejadas.has(row.chave as string));
  if (soltar.length > 0) {
    const { error: soltaError } = await admin
      .from("lots_pendencias")
      .update({ mantida: false })
      .in(
        "chave",
        soltar.map((row) => row.chave),
      );
    if (soltaError) throw new Error(soltaError.message);
  }
  const aindaPausadas = new Set([...pausadas].filter((chave) => desejadas.has(chave)));
  const editadas = new Set(
    (abertas ?? []).filter((row) => row.editada).map((row) => row.chave as string),
  );
  const ladoAtual = new Map((abertas ?? []).map((row) => [row.chave as string, row.lado as string]));
  const paraCliente = drafts
    .filter((item) => item.lado === "cliente" && ladoAtual.get(item.chave) === "admin")
    .map((item) => item.chave);
  const paraAdmin = drafts
    .filter((item) => item.lado === "admin" && ladoAtual.get(item.chave) === "cliente")
    .map((item) => item.chave);
  if (paraCliente.length > 0) {
    const { error: ladoError } = await admin
      .from("lots_pendencias")
      .update({ lado: "cliente" })
      .in("chave", paraCliente);
    if (ladoError) throw new Error(ladoError.message);
  }
  if (paraAdmin.length > 0) {
    const { error: ladoError } = await admin
      .from("lots_pendencias")
      .update({ lado: "admin" })
      .in("chave", paraAdmin);
    if (ladoError) throw new Error(ladoError.message);
  }
  const gravar = drafts.filter(
    (item) => !editadas.has(item.chave) && !aindaPausadas.has(item.chave),
  );
  if (gravar.length === 0) return;
  const entregaAtual = new Map(
    (abertas ?? []).map((row) => [row.chave as string, (row.entrega as string | null) ?? null]),
  );
  const { error: upsertError } = await admin.from("lots_pendencias").upsert(
    gravar.map((item) => ({
      chave: item.chave,
      titulo: item.titulo,
      cadastro_cliente_id: item.cadastroClienteId,
      cliente_nome: item.clienteNome,
      responsavel_user_id: item.responsavelUserId,
      responsavel_nome: item.responsavelNome,
      aviso_user_id: item.avisoUserId,
      visivel_cliente: item.visivelCliente,
      entrega:
        item.entregaFixa && entregaAtual.get(item.chave)
          ? entregaAtual.get(item.chave)
          : item.entrega || null,
      aba: item.aba,
      lado: item.lado,
      href: item.href,
      concluida_em: null,
    })),
    { onConflict: "chave" },
  );
  if (upsertError) throw new Error(upsertError.message);
}

export type LotsBoard = {
  abertas: LotsPendenciaRow[];
  log: LotsPendenciaRow[];
};

function mapRow(row: {
  id?: string;
  chave: string;
  titulo: string;
  cadastro_cliente_id: number | null;
  cliente_nome: string;
  responsavel_user_id?: string | null;
  responsavel_nome: string | null;
  entrega: string | null;
  aba: string;
  lado: string;
  href: string;
  repete?: string | null;
  aviso_user_id?: string | null;
  visivel_cliente?: boolean | null;
  concluida_em: string | null;
}): LotsPendenciaRow {
  return {
    chave: row.chave,
    titulo: row.titulo,
    cadastroClienteId: row.cadastro_cliente_id,
    clienteNome: row.cliente_nome,
    responsavelUserId: row.responsavel_user_id ?? null,
    responsavelNome: row.responsavel_nome,
    entrega: row.entrega ?? "",
    aba: row.aba as LotsPendenciaRow["aba"],
    lado: row.lado === "cliente" ? "cliente" : "admin",
    href: row.href,
    repete: row.repete ?? null,
    avisoUserId: row.aviso_user_id ?? null,
    visivelCliente: row.visivel_cliente === true,
    entregaFixa: false,
    concluidaEm: row.concluida_em,
    logId: row.id ?? null,
  };
}

export const listLotsBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LotsBoard> => {
    const access = await loadCallerAccess(context);
    const operacional = access.isPlatformOwner || access.isOperational || access.isGlobalAdmin;
    const scope = operacional ? null : await getClientAccessScope(context.supabase, context.userId);
    if (!operacional && (scope?.cadastroClienteIds.length ?? 0) === 0) {
      return { abertas: [], log: [] };
    }
    const cadastroFiltro = !operacional
      ? (scope?.cadastroClienteIds ?? [])
      : access.orgTablesReady && !access.seeAllCadastros
        ? access.cadastroIds
        : null;
    try {
      await syncLotsPendencias();
    } catch (error) {
      if (error instanceof Error && missingTable(error.message)) return { abertas: [], log: [] };
      throw error;
    }
    const admin = getSupabaseAdmin();
    let abertasQuery = admin.from("lots_pendencias").select("*").is("concluida_em", null);
    let logQuery = admin
      .from("lots_pendencia_log")
      .select("*")
      .order("concluida_em", { ascending: false })
      .limit(80);
    if (!operacional) {
      abertasQuery = abertasQuery.eq("lado", "cliente");
      logQuery = logQuery.eq("lado", "cliente");
    }
    if (cadastroFiltro) {
      if (cadastroFiltro.length === 0) return { abertas: [], log: [] };
      abertasQuery = abertasQuery.in("cadastro_cliente_id", cadastroFiltro);
      logQuery = logQuery.in("cadastro_cliente_id", cadastroFiltro);
    }
    const [abertasRes, logRes] = await Promise.all([abertasQuery, logQuery]);
    if (abertasRes.error) {
      if (missingTable(abertasRes.error.message)) return { abertas: [], log: [] };
      throw new Error(abertasRes.error.message);
    }
    if (logRes.error && !missingTable(logRes.error.message)) throw new Error(logRes.error.message);
    return {
      abertas: (abertasRes.data ?? []).map((row) => mapRow(row)),
      log: (logRes.data ?? []).map((row) => mapRow({ ...row, concluida_em: row.concluida_em })),
    };
  });

const editSchema = z.object({
  chave: z.string().min(1),
  titulo: z.string().trim().min(1).max(300).optional(),
  cadastro_cliente_id: z.number().int().positive().optional(),
  responsavel_user_id: z.string().uuid().nullable().optional(),
  entrega: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  aba: z.enum(["conteudos", "crm", "relatorio", "diretrizes", "conexoes"]).optional(),
  repete: z
    .string()
    .regex(/^semanal:[0-6]$/)
    .nullable()
    .optional(),
  status: z.enum(["open", "completed", "cancelled"]).optional(),
});

export const updateLotsPendencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => editSchema.parse(input))
  .handler(async ({ data, context }) => {
    const access = await loadCallerAccess(context);
    if (!access.isPlatformOwner && !access.isOperational && !access.isGlobalAdmin) {
      throw new Error("Sem acesso a esta pendência.");
    }
    const admin = getSupabaseAdmin();
    const { data: atual, error } = await admin
      .from("lots_pendencias")
      .select("*")
      .eq("chave", data.chave)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!atual) throw new Error("Pendência não encontrada.");

    if (data.status === "completed" || data.status === "cancelled") {
      const agora = new Date().toISOString();
      const { error: pausaError } = await admin
        .from("lots_pendencia_pausa")
        .upsert({ chave: data.chave }, { onConflict: "chave" });
      if (pausaError) throw new Error(pausaError.message);
      const { data: logged, error: logError } = await admin
        .from("lots_pendencia_log")
        .insert({
          chave: atual.chave,
          titulo: data.titulo ?? atual.titulo,
          cadastro_cliente_id: data.cadastro_cliente_id ?? atual.cadastro_cliente_id,
          cliente_nome: atual.cliente_nome,
          responsavel_user_id:
            data.responsavel_user_id === undefined
              ? atual.responsavel_user_id
              : data.responsavel_user_id,
          responsavel_nome: atual.responsavel_nome,
          entrega: data.entrega === undefined ? atual.entrega : data.entrega,
          aba: data.aba ?? atual.aba,
          lado: atual.lado,
          href: atual.href,
          repete: data.repete === undefined ? atual.repete : data.repete,
          concluida_em: agora,
        })
        .select("id")
        .single();
      if (logError) throw new Error(logError.message);
      const { error: deleteError } = await admin
        .from("lots_pendencias")
        .delete()
        .eq("chave", data.chave);
      if (deleteError) throw new Error(deleteError.message);
      return { closed: true as const, logId: logged.id as string };
    }

    const mudouCliente =
      data.cadastro_cliente_id != null && data.cadastro_cliente_id !== atual.cadastro_cliente_id;
    let clienteNome = atual.cliente_nome as string;
    if (mudouCliente && data.cadastro_cliente_id) {
      const { data: cliente, error: clienteError } = await admin
        .from("cadastro_clientes")
        .select("nome_cliente")
        .eq("id", data.cadastro_cliente_id)
        .maybeSingle();
      if (clienteError) throw new Error(clienteError.message);
      if (!cliente) throw new Error("Cliente não encontrado.");
      clienteNome = cliente.nome_cliente;
    }
    const aba = data.aba ?? atual.aba;
    const mudouAba = data.aba != null && data.aba !== atual.aba;
    const lado = atual.lado === "cliente" ? "cliente" : "admin";
    const href =
      mudouAba || mudouCliente
        ? (taskAbaHref(isTaskSheetAba(aba) ? aba : "conteudos", lado, clienteNome) ?? atual.href)
        : atual.href;
    let responsavelNome = atual.responsavel_nome as string | null;
    if (data.responsavel_user_id === null) responsavelNome = null;
    if (data.responsavel_user_id) {
      const { data: profile } = await admin
        .from("profiles")
        .select("nome, email")
        .eq("id", data.responsavel_user_id)
        .maybeSingle();
      responsavelNome = profile?.nome?.trim() || profile?.email?.trim() || responsavelNome;
    }
    const patch = {
      titulo: data.titulo ?? atual.titulo,
      cadastro_cliente_id: data.cadastro_cliente_id ?? atual.cadastro_cliente_id,
      cliente_nome: clienteNome,
      responsavel_user_id:
        data.responsavel_user_id === undefined
          ? atual.responsavel_user_id
          : data.responsavel_user_id,
      responsavel_nome: responsavelNome,
      entrega: data.entrega === undefined ? atual.entrega : data.entrega,
      aba,
      href,
      repete: data.repete === undefined ? atual.repete : data.repete,
      editada: true,
    };
    const { error: updateError } = await admin
      .from("lots_pendencias")
      .update(patch)
      .eq("chave", data.chave);
    if (updateError) throw new Error(updateError.message);
    return { closed: false as const, logId: null };
  });

export const restoreLotsPendencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ logId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const access = await loadCallerAccess(context);
    if (!access.isPlatformOwner && !access.isOperational && !access.isGlobalAdmin) {
      throw new Error("Sem acesso a esta pendência.");
    }
    const admin = getSupabaseAdmin();
    const { data: log, error } = await admin
      .from("lots_pendencia_log")
      .select("*")
      .eq("id", data.logId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!log) throw new Error("Registro do log não encontrado.");

    const { data: aberta, error: abertaError } = await admin
      .from("lots_pendencias")
      .select("chave")
      .eq("chave", log.chave)
      .maybeSingle();
    if (abertaError) throw new Error(abertaError.message);
    if (!aberta) {
      const { error: insertError } = await admin.from("lots_pendencias").insert({
        chave: log.chave,
        titulo: log.titulo,
        cadastro_cliente_id: log.cadastro_cliente_id,
        cliente_nome: log.cliente_nome,
        responsavel_user_id: log.responsavel_user_id ?? null,
        responsavel_nome: log.responsavel_nome,
        entrega: log.entrega,
        aba: log.aba,
        lado: log.lado,
        href: log.href,
        repete: log.repete ?? null,
        editada: false,
        mantida: true,
        concluida_em: null,
      });
      if (insertError) throw new Error(insertError.message);
    }
    const { error: pausaError } = await admin
      .from("lots_pendencia_pausa")
      .delete()
      .eq("chave", log.chave);
    if (pausaError) throw new Error(pausaError.message);
    const { error: deleteError } = await admin
      .from("lots_pendencia_log")
      .delete()
      .eq("id", data.logId);
    if (deleteError) throw new Error(deleteError.message);
    return { chave: log.chave as string };
  });
