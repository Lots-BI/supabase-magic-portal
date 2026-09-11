// Server functions para o painel administrativo.
// Todas exigem auth + role 'admin'. Soft delete sempre — nunca DELETE físico de clientes.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { repairOwnerAdminRole, resolveIsAdmin } from "@/lib/owner-admin";
import { z } from "zod";
import { DEBUG_DAILY_VIEW_SAMPLE_SELECT, SERVICOS_SELECT } from "@/lib/db-selects";
import { OVERVIEW_CLIENTE_SELECT } from "@/lib/metrics";
import { resolveAuthInviteRedirectUrl } from "@/lib/app-url.server";
import {
  AuthInviteError,
  resendAuthInviteEmail,
  sendAuthInviteEmail,
} from "@/modules/admin/invites.server";
import { getInviteStatsForEmail } from "@/lib/infra/invite-audit";
import {
  fetchInviteAuditLogFromDb,
  fetchInviteStatsByUserIds,
} from "@/features/access/access-audit.server";
import {
  evaluateAuthDiagnostics,
  evaluateSystemDiagnostics,
} from "@/lib/infra/system-diagnostics.server";

type AuthCtx = {
  supabase: Parameters<typeof resolveIsAdmin>[0]["supabase"];
  userId: string;
  claims?: { email?: string | null };
};

async function assertAdmin(ctx: AuthCtx) {
  const email = ctx.claims?.email ?? undefined;
  const ok = await resolveIsAdmin({
    supabase: ctx.supabase,
    userId: ctx.userId,
    email,
    repair: true,
  });
  if (!ok) throw new Error("Forbidden: admin role required");
}

// ---------- CHECK ROLE ----------
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims?.email ?? undefined;
    const isAdmin = await resolveIsAdmin({
      supabase: context.supabase,
      userId: context.userId,
      email,
      repair: true,
    });
    return { isAdmin };
  });

// ---------- CLIENTES ----------
export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("vw_clientes_admin")
      .select("*")
      .order("nome_cliente", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cliente, error } = await context.supabase
      .from("cadastro_clientes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { data: servicos } = await context.supabase
      .from("cliente_servicos")
      .select("id, servico_id, ativo, valor, observacoes")
      .eq("cadastro_cliente_id", data.id);

    const { data: acessos } = await context.supabase
      .from("client_access")
      .select("id, user_id, cliente_nome, created_at")
      .eq("cliente_nome", cliente.nome_cliente);

    return { cliente, servicos: servicos ?? [], acessos: acessos ?? [] };
  });

const optText = (max = 200) => z.string().trim().max(max).optional().nullable().or(z.literal(""));

const clienteFields = z.object({
  nome_cliente: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use somente a-z, 0-9 e hífen"),
  ativo: z.boolean().default(true),
  empresa: z.string().trim().max(200).optional().nullable(),
  email_principal: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  telefone: z.string().trim().max(50).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  // Flags de plataforma (mantidas como text por compat com o Make existente).
  google_ads_ativo: z.string().optional().nullable(),
  meta_ativo: z.string().optional().nullable(),
  ga4_ativo: z.string().optional().nullable(),
  instagram_ativo: z.boolean().default(false),
  google_business_ativo: z.string().optional().nullable(),
  tiktok_ativo: z.boolean().default(false),
  // Identificadores técnicos consumidos pelos cenários do Make.
  google_ads_customer_id: optText(),
  facebook_ad_account_id: optText(),
  instagram_username: optText(),
  instagram_page_id: optText(),
  ga4_property_id: optText(),
  google_business_location_id: optText(),
  tiktok_ad_account_id: optText(),
  // Comercial.
  mlabs_url: z.string().trim().max(500).optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  valor_mensal: z.number().nullable().optional(),
});

function translatePgError(message: string): string {
  if (/duplicate key.*slug/i.test(message) || /cadastro_clientes_slug_key/i.test(message)) {
    return "Este slug já está em uso por outro cliente.";
  }
  if (/duplicate key/i.test(message)) return "Registro duplicado.";
  if (/violates foreign key/i.test(message)) return "Referência inválida.";
  if (/violates not-null/i.test(message)) return "Campo obrigatório não preenchido.";
  return message;
}

export const checkSlugAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(1), excludeId: z.number().int().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("cadastro_clientes").select("id").eq("slug", data.slug);
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: rows, error } = await q.limit(1);
    if (error) throw new Error(translatePgError(error.message));
    return { available: !rows || rows.length === 0 };
  });

function sanitizeClientePayload<T extends Record<string, any>>(input: T): T {
  const out: any = { ...input };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === "string" && out[k].trim() === "") out[k] = null;
  }
  return out;
}

export const createCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clienteFields.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = sanitizeClientePayload(data);
    const { data: row, error } = await context.supabase
      .from("cadastro_clientes")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(translatePgError(error.message));
    return row;
  });

export const updateCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.number().int() }).merge(clienteFields.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const patch = sanitizeClientePayload(rest);
    const { data: row, error } = await context.supabase
      .from("cadastro_clientes")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(translatePgError(error.message));
    return row;
  });

export const toggleClienteAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; ativo: boolean }) =>
    z.object({ id: z.number().int(), ativo: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("cadastro_clientes")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Soft delete: alias para toggleClienteAtivo(false). DELETE físico NUNCA é exposto.
export const deactivateCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("cadastro_clientes")
      .update({ ativo: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- SERVIÇOS ----------
export const listServicos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("servicos").select(SERVICOS_SELECT);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(120),
        descricao: z.string().trim().max(500).optional().nullable(),
        ativo: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase
        .from("servicos")
        .update({ nome: data.nome, descricao: data.descricao ?? null, ativo: data.ativo })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("servicos")
        .insert({ nome: data.nome, descricao: data.descricao ?? null, ativo: data.ativo });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setClienteServicos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastro_cliente_id: z.number().int(),
        items: z.array(
          z.object({
            servico_id: z.string().uuid(),
            ativo: z.boolean().default(true),
            valor: z.number().nullable().optional(),
            observacoes: z.string().max(500).optional().nullable(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: current } = await context.supabase
      .from("cliente_servicos")
      .select("id, servico_id")
      .eq("cadastro_cliente_id", data.cadastro_cliente_id);
    const keep = new Set(data.items.map((i) => i.servico_id));
    const toDeactivate = (current ?? []).filter((c: any) => !keep.has(c.servico_id));
    if (toDeactivate.length) {
      await context.supabase
        .from("cliente_servicos")
        .update({ ativo: false })
        .in(
          "id",
          toDeactivate.map((c: any) => c.id),
        );
    }
    for (const item of data.items) {
      const existing = (current ?? []).find((c: any) => c.servico_id === item.servico_id);
      if (existing) {
        await context.supabase
          .from("cliente_servicos")
          .update({
            ativo: item.ativo,
            valor: item.valor ?? null,
            observacoes: item.observacoes ?? null,
          })
          .eq("id", existing.id);
      } else {
        await context.supabase.from("cliente_servicos").insert({
          cadastro_cliente_id: data.cadastro_cliente_id,
          servico_id: item.servico_id,
          ativo: item.ativo,
          valor: item.valor ?? null,
          observacoes: item.observacoes ?? null,
        });
      }
    }
    return { ok: true };
  });

// ---------- USUÁRIOS & ACESSOS ----------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    return data.users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at }));
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [usersRes, rolesRes, accessRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("client_access").select("user_id, cliente_nome"),
    ]);
    if (usersRes.error) throw new Error(usersRes.error.message);
    const userIds = usersRes.data.users.map((u) => u.id);
    const auditByUser = await fetchInviteStatsByUserIds(userIds);
    const rolesByUser = new Map<string, string[]>();
    (rolesRes.data ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const accessByUser = new Map<string, string[]>();
    (accessRes.data ?? []).forEach((a: any) => {
      const arr = accessByUser.get(a.user_id) ?? [];
      arr.push(a.cliente_nome);
      accessByUser.set(a.user_id, arr);
    });
    return usersRes.data.users.map((u) => {
      const roles = rolesByUser.get(u.id) ?? [];
      const isAdmin = roles.includes("admin");
      const email = u.email ?? "";
      const audit = auditByUser.get(u.id) ?? getInviteStatsForEmail(email);
      return {
        id: u.id,
        email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        invited_at: u.invited_at ?? null,
        confirmation_sent_at: u.confirmation_sent_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        invite_pending: !u.last_sign_in_at,
        invite_last_sent_at: audit.last_sent_at ?? u.confirmation_sent_at ?? u.invited_at ?? null,
        invite_resend_count: audit.resend_count,
        invite_last_success: audit.last_success,
        is_admin: isAdmin,
        tipo: isAdmin ? ("admin" as const) : ("cliente" as const),
        clientes: accessByUser.get(u.id) ?? [],
      };
    });
  });

export const grantClientAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        cadastro_cliente_id: z.number().int(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cliente, error: e1 } = await context.supabase
      .from("cadastro_clientes")
      .select("id, nome_cliente")
      .eq("id", data.cadastro_cliente_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { error } = await context.supabase.from("client_access").insert({
      user_id: data.user_id,
      cliente_nome: cliente.nome_cliente,
      cadastro_cliente_id: cliente.id,
    });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

export const revokeClientAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("client_access").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- CRIAR USUÁRIO (admin) ----------
export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        nome: z.string().trim().max(200).optional().nullable(),
        tipo: z.enum(["admin", "cliente"]).default("cliente"),
        mode: z.enum(["invite", "password"]).default("invite"),
        password: z.string().min(8).max(72).optional().nullable(),
        cadastro_cliente_id: z.number().int().optional().nullable(),
        client_origin: z.string().url().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    let inviteSent = false;
    let tempPassword: string | null = null;

    const genPwd = () => `LotsBI#${Math.random().toString(36).slice(2, 10)}A1`;

    if (data.mode === "invite") {
      try {
        const invite = await sendAuthInviteEmail(
          supabaseAdmin,
          data.email,
          { full_name: data.nome },
          data.client_origin,
        );
        userId = invite.userId;
        inviteSent = true;
      } catch (err) {
        if (err instanceof AuthInviteError) throw new Error(err.message);
        throw err;
      }
    } else {
      const temp = data.password && data.password.length >= 8 ? data.password : genPwd();
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: temp,
        email_confirm: true,
        user_metadata: { full_name: data.nome ?? undefined },
      });
      if (error) throw new Error(translatePgError(error.message));
      userId = created.user?.id ?? null;
      tempPassword = temp;
    }

    if (!userId) throw new Error("Falha ao obter id do usuário criado.");

    const { ensureAccessAccountRow } = await import("@/lib/access.functions.server");
    await ensureAccessAccountRow(userId, inviteSent ? "invite_pending" : "awaiting_password");

    if (data.tipo === "admin" || isPlatformOwnerEmail(data.email)) {
      const { error: er } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (er && !/duplicate key/i.test(er.message)) throw new Error(er.message);
    }

    if (data.cadastro_cliente_id) {
      const { data: cliente, error: ec } = await supabaseAdmin
        .from("cadastro_clientes")
        .select("id, nome_cliente")
        .eq("id", data.cadastro_cliente_id)
        .maybeSingle();
      if (ec) throw new Error(ec.message);
      if (cliente) {
        const { error: ea } = await supabaseAdmin.from("client_access").insert({
          user_id: userId,
          cliente_nome: cliente.nome_cliente,
          cadastro_cliente_id: cliente.id,
        });
        if (ea && !/duplicate key/i.test(ea.message)) throw new Error(ea.message);
      }
    }

    return {
      user_id: userId,
      invite_sent: inviteSent,
      temp_password: tempPassword,
      invite_redirect_to: inviteSent ? resolveAuthInviteRedirectUrl() : null,
    };
  });

// ---------- REENVIAR CONVITE ----------
export const resendUserInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        client_origin: z.string().url().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      data.user_id,
    );
    if (userError) throw new Error(userError.message);
    const email = userData.user?.email;
    if (!email) throw new Error("Usuário sem e-mail cadastrado.");

    try {
      const invite = await resendAuthInviteEmail(
        supabaseAdmin,
        email,
        data.user_id,
        {
          full_name: (userData.user?.user_metadata?.full_name as string | undefined) ?? null,
        },
        data.client_origin,
      );
      return { ok: true as const, invite_redirect_to: invite.redirectTo };
    } catch (err) {
      if (err instanceof AuthInviteError) throw new Error(err.message);
      throw err;
    }
  });

// ---------- DIAGNÓSTICO AUTH (admin) ----------
export const getAuthDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ client_origin: z.string().url().optional().nullable() }).optional().parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return evaluateAuthDiagnostics(data?.client_origin ?? null);
  });

// ---------- DIAGNÓSTICO SISTEMA (admin / debug) ----------
export const getSystemDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ client_origin: z.string().url().optional().nullable() }).optional().parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plataformas } = await supabaseAdmin.from("base_metricas").select("plataforma");
    const porPlataforma: Record<string, number> = {};
    (plataformas ?? []).forEach((r: { plataforma?: string }) => {
      const k = r?.plataforma ?? "(null)";
      porPlataforma[k] = (porPlataforma[k] ?? 0) + 1;
    });

    return evaluateSystemDiagnostics(
      data?.client_origin ?? null,
      Object.entries(porPlataforma).map(([plataforma, total]) => ({ plataforma, total })),
    );
  });

// ---------- CONFIG CONVITE (admin / diagnóstico legado) ----------
export const getAuthInviteConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const report = await evaluateAuthDiagnostics();
    return {
      ok: report.invites_allowed,
      app_url: report.app_url_configured,
      invite_redirect_to: report.invite_redirect,
      localhost_warning: report.app_url_configured
        ? report.app_url_configured.includes("localhost")
        : false,
      error: report.block_invites_reason,
      auth: report,
    };
  });

// ---------- DEBUG / DIAGNÓSTICO ----------
export const getDebugSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safe = async <T>(p: PromiseLike<{ data: T; error: any }>) => {
      try {
        const { data, error } = await p;
        return { data: (data ?? null) as T | null, error: error?.message ?? null };
      } catch (e: any) {
        return { data: null as T | null, error: e?.message ?? String(e) };
      }
    };

    const [
      totalRes,
      ultimosRes,
      clientesRes,
      plataformasRes,
      ultimaDataRes,
      overviewRes,
      googleRes,
      metaRes,
      ga4Res,
      instaRes,
    ] = await Promise.all([
      safe(supabaseAdmin.from("base_metricas").select("*", { count: "exact", head: true })),
      safe(
        supabaseAdmin
          .from("base_metricas")
          .select("id, data, cliente, plataforma, metrica, valor, campanha, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ),
      safe(supabaseAdmin.from("base_metricas").select("cliente")),
      safe(supabaseAdmin.from("base_metricas").select("plataforma")),
      safe(
        supabaseAdmin
          .from("base_metricas")
          .select("data")
          .order("data", { ascending: false })
          .limit(1),
      ),
      // Views analíticas: SEMPRE via context.supabase (usuário autenticado).
      // O filtro interno depende de current_user_clientes() => auth.uid().
      // Com service_role, auth.uid() é NULL e as views retornam 0 linhas.
      safe(
        context.supabase
          .from("vw_overview_cliente")
          .select(OVERVIEW_CLIENTE_SELECT)
          .order("data", { ascending: false })
          .limit(20),
      ),
      safe(
        context.supabase
          .from("vw_meta_ads_diario")
          .select(DEBUG_DAILY_VIEW_SAMPLE_SELECT)
          .order("data", { ascending: false })
          .limit(20),
      ),
      safe(
        context.supabase
          .from("vw_ga4_diario")
          .select(DEBUG_DAILY_VIEW_SAMPLE_SELECT)
          .order("data", { ascending: false })
          .limit(20),
      ),
      safe(
        context.supabase
          .from("vw_instagram_diario")
          .select(DEBUG_DAILY_VIEW_SAMPLE_SELECT)
          .order("data", { ascending: false })
          .limit(20),
      ),
    ]);

    const totalRegistros =
      (totalRes as any)?.error == null ? ((totalRes as any).count ?? null) : null;
    // count comes via head:true — re-run to capture it properly
    const totalCount = await supabaseAdmin
      .from("base_metricas")
      .select("*", { count: "exact", head: true });

    const clientesSet = new Set<string>();
    (clientesRes.data as any[] | null)?.forEach((r) => r?.cliente && clientesSet.add(r.cliente));

    const porPlataforma: Record<string, number> = {};
    (plataformasRes.data as any[] | null)?.forEach((r) => {
      const k = r?.plataforma ?? "(null)";
      porPlataforma[k] = (porPlataforma[k] ?? 0) + 1;
    });

    return {
      total_registros: totalCount.count ?? null,
      total_clientes: clientesSet.size,
      ultima_data: (ultimaDataRes.data as any[] | null)?.[0]?.data ?? null,
      auth_invite: await evaluateAuthDiagnostics(),
      por_plataforma: Object.entries(porPlataforma)
        .map(([plataforma, total]) => ({ plataforma, total }))
        .sort((a, b) => b.total - a.total),
      ultimos: ultimosRes,
      views: {
        vw_overview_cliente: overviewRes,
        vw_google_ads_diario: googleRes,
        vw_meta_ads_diario: metaRes,
        vw_ga4_diario: ga4Res,
        vw_instagram_diario: instaRes,
      },
      errors: {
        total: totalRes.error,
        ultimos: ultimosRes.error,
        clientes: clientesRes.error,
        plataformas: plataformasRes.error,
        ultima_data: ultimaDataRes.error,
      },
    };
  });

// ---------- AUDITORIA DE VIEWS ----------
// Compara contagem das views via service_role (bypass RLS, mas filtro interno
// das views depende de current_user_clientes() => auth.uid()) vs via usuário
// admin autenticado (auth.uid() válido). Usado em /admin/debug/views.
const VIEW_SQL: Record<string, string> = {
  vw_metricas_normalizadas: `CREATE OR REPLACE VIEW public.vw_metricas_normalizadas
WITH (security_invoker = on) AS
SELECT bm.id, bm.data, bm.cliente,
  CASE lower(bm.plataforma)
    WHEN 'meta ads' THEN 'meta_ads'
    WHEN 'google ads' THEN 'google_ads'
    WHEN 'google analytics 4' THEN 'ga4'
    WHEN 'instagram' THEN 'instagram'
    WHEN 'google business' THEN 'google_business'
    WHEN 'tiktok' THEN 'tiktok'
    ELSE lower(replace(bm.plataforma, ' ', '_'))
  END AS plataforma,
  lower(bm.metrica) AS metrica,
  CASE WHEN lower(bm.plataforma)='google ads' AND lower(bm.metrica)='spend'
    THEN bm.valor/1000000.0 ELSE bm.valor END AS valor,
  bm.campanha, bm.created_at
FROM public.base_metricas bm
WHERE bm.cliente IN (SELECT cliente_nome FROM public.current_user_clientes());`,
  vw_overview_cliente: `Filtra: plataforma IN ('meta_ads','google_ads','ga4','instagram')\nMétricas usadas: spend, impressions, clicks, sessions, conversions, reach, total_interactions`,
  vw_meta_ads_diario: `Filtra: plataforma = 'meta_ads'\nMétricas: reach, impressions, clicks, spend, results, conversions, inline_link_clicks, unique_clicks, link_clicks, landing_page_views, video_views, post_engagements`,
  vw_google_ads_diario: `Filtra: plataforma = 'google_ads'\nMétricas: impressions, clicks, spend (com /1000000)`,
  vw_ga4_diario: `Filtra: plataforma = 'ga4'\nMétricas: activeusers, sessions, engagedsessions, screenpageviews, eventcount, conversions`,
  vw_instagram_diario: `Filtra: plataforma = 'instagram'\nMétricas: reach, total_interactions, accounts_engaged, likes, comments, saves, shares, profile_links_taps, views, replies, website_clicks, follows`,
};

export const getViewsAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safe = async <T>(p: PromiseLike<{ data: T; error: any; count?: number | null }>) => {
      try {
        const r = await p;
        return {
          data: (r.data ?? null) as T | null,
          error: r.error?.message ?? null,
          count: r.count ?? null,
        };
      } catch (e: any) {
        return { data: null as T | null, error: e?.message ?? String(e), count: null };
      }
    };

    const viewNames = [
      "vw_overview_cliente",
      "vw_meta_ads_diario",
      "vw_google_ads_diario",
      "vw_ga4_diario",
      "vw_instagram_diario",
    ];

    // 1. Distinct values via service_role (bypass RLS — vê tudo em base_metricas)
    const [plataformasRaw, metricasRaw, clientesRaw] = await Promise.all([
      safe(supabaseAdmin.from("base_metricas").select("plataforma")),
      safe(supabaseAdmin.from("base_metricas").select("metrica")),
      safe(supabaseAdmin.from("base_metricas").select("cliente")),
    ]);

    const distinct = (rows: any[] | null, key: string) => {
      const s = new Set<string>();
      (rows ?? []).forEach((r) => r?.[key] != null && s.add(String(r[key])));
      return Array.from(s).sort();
    };
    const distinctPlataformas = distinct(plataformasRaw.data as any[] | null, "plataforma");
    const distinctMetricas = distinct(metricasRaw.data as any[] | null, "metrica");
    const distinctClientes = distinct(clientesRaw.data as any[] | null, "cliente");

    // 2. current_user_clientes() — para o admin autenticado deve retornar TUDO
    const cucAuth = await safe(context.supabase.rpc("current_user_clientes"));
    const cucService = await safe(supabaseAdmin.rpc("current_user_clientes"));

    // 3. Contagem de cada view: service_role (espera 0) vs admin autenticado (espera dados)
    const viewResults: Record<
      string,
      {
        service: { count: number | null; error: string | null; sample: any[] | null };
        authed: { count: number | null; error: string | null; sample: any[] | null };
        sql: string;
      }
    > = {};

    for (const v of viewNames) {
      const [svc, aut] = await Promise.all([
        safe(
          supabaseAdmin
            .from(v as any)
            .select("*", { count: "exact" })
            .limit(3),
        ),
        safe(
          context.supabase
            .from(v as any)
            .select("*", { count: "exact" })
            .limit(3),
        ),
      ]);
      viewResults[v] = {
        service: { count: svc.count, error: svc.error, sample: svc.data as any[] | null },
        authed: { count: aut.count, error: aut.error, sample: aut.data as any[] | null },
        sql: VIEW_SQL[v] ?? "(definição não capturada)",
      };
    }

    // 4. Normalização esperada — quais plataformas do raw mapeariam para algum filtro?
    const normalize = (p: string) => {
      const l = p.toLowerCase();
      const map: Record<string, string> = {
        "meta ads": "meta_ads",
        "google ads": "google_ads",
        "google analytics 4": "ga4",
        instagram: "instagram",
        "google business": "google_business",
        tiktok: "tiktok",
      };
      return map[l] ?? l.replace(/ /g, "_");
    };
    const normalizationMap = distinctPlataformas.map((p) => ({
      raw: p,
      normalized: normalize(p),
    }));

    return {
      base_metricas: {
        distinct_plataformas: distinctPlataformas,
        distinct_metricas: distinctMetricas,
        distinct_clientes: distinctClientes,
        normalization_map: normalizationMap,
      },
      current_user_clientes: {
        as_admin_authenticated: cucAuth,
        as_service_role: cucService,
      },
      base_metricas_view_sql: VIEW_SQL.vw_metricas_normalizadas,
      views: viewResults,
    };
  });
