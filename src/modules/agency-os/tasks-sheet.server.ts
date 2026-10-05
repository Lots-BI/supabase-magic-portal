import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { getClientAccessScope } from "@/modules/approval/internal/client-access.server";
import { insertAppNotifications } from "@/modules/notifications/insert-app-notifications.server";
import {
  assertCadastroAllowed,
  assertOperationalAccess,
  loadCallerAccess,
  type CallerAccess,
} from "@/modules/access/organization.server";
import {
  assigneeInScope,
  assigneeTipo,
  dueAtToEntrega,
  entregaToDueAt,
  formatRepete,
  isTaskSheetAba,
  isTaskSheetStatus,
  nextWeeklyEntrega,
  normalizeTaskDescription,
  parseRepete,
  todayInSaoPaulo,
  visibleCadastroIds,
  type TaskSheetAba,
  type TaskSheetClient,
  type TaskSheetStatus,
  type TaskSheetTask,
  type TaskSheetUser,
} from "./tasks-sheet";

const TASK_COLUMNS =
  "id, titulo, cadastro_cliente_id, due_at, status, descricao, responsavel_user_id, aba, recorrencia, recorrencia_dia, completed_at";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(1, "Escreva a tarefa.").max(300),
  cadastro_cliente_id: z.number().int().positive(),
  entrega: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de entrega inválida.")
    .nullable()
    .optional(),
  status: z.enum(["open", "completed", "cancelled"]),
  descricao: z.string().max(40000).nullable().optional(),
  responsavel_user_id: z.string().uuid().nullable().optional(),
  aba: z.enum(["conteudos", "crm", "relatorio", "diretrizes", "conexoes"]).nullable().optional(),
  repete: z
    .string()
    .regex(/^semanal:[0-6]$/)
    .nullable()
    .optional(),
});

function translateDbError(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return "Sem acesso a este cliente.";
  }
  if (/agency_tasks/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "A tabela de tarefas ainda não está disponível.";
  }
  return message;
}

function mapTask(
  row: {
    id: string;
    titulo: string;
    cadastro_cliente_id: number;
    due_at: string | null;
    status: string;
    descricao?: string | null;
    responsavel_user_id?: string | null;
    aba?: string | null;
    recorrencia?: string | null;
    recorrencia_dia?: number | null;
    completed_at?: string | null;
  },
  nomes: Map<number, string>,
  usuarios: Map<string, string>,
): TaskSheetTask {
  if (!isTaskSheetStatus(row.status)) {
    throw new Error("Status de tarefa desconhecido.");
  }
  return {
    id: row.id,
    titulo: row.titulo,
    cadastro_cliente_id: row.cadastro_cliente_id,
    cliente_nome: nomes.get(row.cadastro_cliente_id) ?? `Cliente ${row.cadastro_cliente_id}`,
    entrega: dueAtToEntrega(row.due_at),
    status: row.status,
    descricao: row.descricao ?? null,
    responsavel_user_id: row.responsavel_user_id ?? null,
    responsavel_nome: row.responsavel_user_id
      ? (usuarios.get(row.responsavel_user_id) ?? "Usuário")
      : null,
    aba: isTaskSheetAba(row.aba) ? row.aba : null,
    repete: formatRepete(row.recorrencia, row.recorrencia_dia),
    concluida_em: row.completed_at ?? null,
  };
}

function assertSheetClient(
  access: Awaited<ReturnType<typeof loadCallerAccess>>,
  cadastroId: number,
) {
  try {
    assertCadastroAllowed(access, cadastroId);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      throw new Error("Sem acesso a este cliente.");
    }
    throw error;
  }
}

async function requireSheetAccess(context: Parameters<typeof loadCallerAccess>[0]) {
  const access = await loadCallerAccess(context);
  try {
    assertOperationalAccess(access);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      throw new Error("Sem acesso a tarefas.");
    }
    throw error;
  }
  return access;
}

export const listTaskSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await requireSheetAccess(context);
    const ids = visibleCadastroIds(access);
    if (ids && ids.length === 0) {
      return {
        clients: [] as TaskSheetClient[],
        tasks: [] as TaskSheetTask[],
        users: [] as TaskSheetUser[],
      };
    }

    let clientsQuery = context.supabase
      .from("cadastro_clientes")
      .select("id, nome_cliente, ativo")
      .order("nome_cliente", { ascending: true });
    let tasksQuery = context.supabase
      .from("agency_tasks")
      .select(TASK_COLUMNS)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("titulo", { ascending: true })
      .limit(500);

    if (ids) {
      clientsQuery = clientsQuery.in("id", ids);
      tasksQuery = tasksQuery.in("cadastro_cliente_id", ids);
    }

    const [clientsRes, tasksRes, users] = await Promise.all([
      clientsQuery,
      tasksQuery,
      listAssignees(access),
    ]);
    if (clientsRes.error) throw new Error(translateDbError(clientsRes.error.message));
    if (tasksRes.error) throw new Error(translateDbError(tasksRes.error.message));

    const clients: TaskSheetClient[] = (clientsRes.data ?? []).map((row) => ({
      id: row.id,
      nome: row.nome_cliente?.trim() || `Cliente ${row.id}`,
      ativo: row.ativo !== false,
    }));
    const nomes = new Map(clients.map((client) => [client.id, client.nome]));
    const usuarios = new Map(users.map((user) => [user.id, user.nome]));
    const tasks = (tasksRes.data ?? []).map((row) => mapTask(row, nomes, usuarios));
    return { clients, tasks, users };
  });

export const saveTaskSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const access = await requireSheetAccess(context);
    assertSheetClient(access, data.cadastro_cliente_id);
    const dueAt = entregaToDueAt(data.entrega);
    const status: TaskSheetStatus = data.status;

    if (data.id) {
      const { data: existing, error: readError } = await context.supabase
        .from("agency_tasks")
        .select("id, status, cadastro_cliente_id, due_at, recorrencia, recorrencia_dia")
        .eq("id", data.id)
        .maybeSingle();
      if (readError) throw new Error(translateDbError(readError.message));
      if (!existing) throw new Error("Tarefa não encontrada.");
      assertSheetClient(access, existing.cadastro_cliente_id);

      const patch: {
        titulo: string;
        cadastro_cliente_id: number;
        due_at: string | null;
        status: TaskSheetStatus;
        descricao?: string | null;
        responsavel_user_id?: string | null;
        aba?: TaskSheetAba | null;
        recorrencia?: string | null;
        recorrencia_dia?: number | null;
        completed_at?: string | null;
        completed_on_date?: string | null;
      } = {
        titulo: data.titulo,
        cadastro_cliente_id: data.cadastro_cliente_id,
        due_at: dueAt,
        status,
      };
      if (data.descricao !== undefined) {
        patch.descricao = normalizeTaskDescription(data.descricao);
      }
      if (data.responsavel_user_id !== undefined) {
        if (data.responsavel_user_id) await assertAssigneeAllowed(access, data.responsavel_user_id);
        patch.responsavel_user_id = data.responsavel_user_id;
      }
      if (data.aba !== undefined) patch.aba = data.aba;
      if (data.repete !== undefined) {
        const parsed = parseRepete(data.repete);
        patch.recorrencia = parsed?.recorrencia ?? null;
        patch.recorrencia_dia = parsed?.dia ?? null;
      }
      const recorrencia =
        patch.recorrencia !== undefined ? patch.recorrencia : existing.recorrencia;
      const recorrenciaDia =
        patch.recorrencia_dia !== undefined ? patch.recorrencia_dia : existing.recorrencia_dia;
      const repeats = recorrencia === "semanal" && recorrenciaDia != null;
      const finishing = status === "completed" && existing.status !== "completed";
      if (finishing) {
        const now = new Date();
        patch.completed_at = now.toISOString();
        patch.completed_on_date = data.entrega ?? now.toISOString().slice(0, 10);
      }
      if (status !== "completed" && existing.status === "completed") {
        patch.completed_at = null;
        patch.completed_on_date = null;
      }

      const { data: saved, error } = await context.supabase
        .from("agency_tasks")
        .update(patch)
        .eq("id", data.id)
        .select(TASK_COLUMNS)
        .maybeSingle();
      if (error) throw new Error(translateDbError(error.message));
      if (!saved) throw new Error("Tarefa não encontrada.");
      if (finishing && repeats && recorrenciaDia != null) {
        const base = dueAtToEntrega(saved.due_at) || todayInSaoPaulo();
        await context.supabase.from("agency_tasks").insert({
          titulo: saved.titulo,
          cadastro_cliente_id: saved.cadastro_cliente_id,
          due_at: entregaToDueAt(nextWeeklyEntrega(base, Number(recorrenciaDia))),
          status: "open",
          descricao: saved.descricao,
          responsavel_user_id: saved.responsavel_user_id,
          aba: saved.aba,
          recorrencia: "semanal",
          recorrencia_dia: Number(recorrenciaDia),
          created_by: context.userId,
        });
      }
      if (finishing) {
        await notifyClientTaskCompleted(saved.id, saved.titulo, saved.cadastro_cliente_id);
      }
      return mapTask(
        saved,
        await clientNames(context.supabase, [saved.cadastro_cliente_id]),
        await assigneeLabels([saved.responsavel_user_id]),
      );
    }

    if (data.responsavel_user_id) await assertAssigneeAllowed(access, data.responsavel_user_id);
    const { data: created, error } = await context.supabase
      .from("agency_tasks")
      .insert({
        titulo: data.titulo,
        cadastro_cliente_id: data.cadastro_cliente_id,
        due_at: dueAt,
        status,
        created_by: context.userId,
        responsavel_user_id: data.responsavel_user_id ?? null,
        aba: data.aba ?? null,
        recorrencia: parseRepete(data.repete)?.recorrencia ?? null,
        recorrencia_dia: parseRepete(data.repete)?.dia ?? null,
        ...(status === "completed"
          ? {
              completed_at: new Date().toISOString(),
              completed_on_date: data.entrega ?? new Date().toISOString().slice(0, 10),
            }
          : {}),
      })
      .select(TASK_COLUMNS)
      .single();
    if (error) throw new Error(translateDbError(error.message));
    return mapTask(
      created,
      await clientNames(context.supabase, [created.cadastro_cliente_id]),
      await assigneeLabels([created.responsavel_user_id]),
    );
  });

export const listClientTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await getClientAccessScope(context.supabase, context.userId);
    if (scope.cadastroClienteIds.length === 0) return [] as TaskSheetTask[];

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("agency_tasks")
      .select(TASK_COLUMNS)
      .in("cadastro_cliente_id", scope.cadastroClienteIds)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("titulo", { ascending: true })
      .limit(200);
    if (error) throw new Error(translateDbError(error.message));

    const { data: clients, error: clientError } = await admin
      .from("cadastro_clientes")
      .select("id, nome_cliente")
      .in("id", scope.cadastroClienteIds);
    if (clientError) throw new Error(clientError.message);
    const nomes = new Map(
      (clients ?? []).map((row) => [row.id, row.nome_cliente?.trim() || `Cliente ${row.id}`]),
    );
    const usuarios = await assigneeLabels((data ?? []).map((row) => row.responsavel_user_id));
    return (data ?? []).map((row) => mapTask(row, nomes, usuarios));
  });

export const deleteTaskSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const access = await requireSheetAccess(context);
    const ids = [...new Set(data.ids)];
    const { data: existing, error: readError } = await context.supabase
      .from("agency_tasks")
      .select("id, cadastro_cliente_id")
      .in("id", ids);
    if (readError) throw new Error(translateDbError(readError.message));
    if (!existing || existing.length !== ids.length) throw new Error("Tarefa não encontrada.");
    for (const row of existing) assertSheetClient(access, row.cadastro_cliente_id);

    const { error } = await context.supabase.from("agency_tasks").delete().in("id", ids);
    if (error) throw new Error(translateDbError(error.message));
    return { ids };
  });

async function clientNames(
  supabase: Parameters<typeof loadCallerAccess>[0]["supabase"],
  ids: number[],
) {
  const nomes = new Map<number, string>();
  if (ids.length === 0) return nomes;
  const { data, error } = await supabase
    .from("cadastro_clientes")
    .select("id, nome_cliente")
    .in("id", ids);
  if (error) throw new Error(translateDbError(error.message));
  for (const row of data ?? []) {
    nomes.set(row.id, row.nome_cliente?.trim() || `Cliente ${row.id}`);
  }
  return nomes;
}

async function listAuthUsers() {
  const admin = getSupabaseAdmin();
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    users.push(...data.users.map((user) => ({ id: user.id, email: user.email })));
    if (data.users.length < 200) break;
  }
  return users;
}

async function listAssignees(access: CallerAccess): Promise<TaskSheetUser[]> {
  const admin = getSupabaseAdmin();
  const authUsers = await listAuthUsers();
  const [rolesRes, profilesRes, membersRes] = await Promise.all([
    admin.from("user_roles").select("user_id, role"),
    admin.from("profiles").select("id, nome, email"),
    access.orgTablesReady
      ? admin.from("organization_members").select("user_id, role, organization_id")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (rolesRes.error) throw new Error(rolesRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  const appRoles = new Map<string, string[]>();
  for (const row of rolesRes.data ?? []) {
    const list = appRoles.get(row.user_id) ?? [];
    list.push(row.role);
    appRoles.set(row.user_id, list);
  }
  const memberships = new Map<string, { role: string; organization_id: string }[]>();
  for (const row of membersRes.data ?? []) {
    const list = memberships.get(row.user_id) ?? [];
    list.push({ role: row.role, organization_id: row.organization_id });
    memberships.set(row.user_id, list);
  }
  const profiles = new Map((profilesRes.data ?? []).map((row) => [row.id, row] as const));

  const users: TaskSheetUser[] = [];
  for (const user of authUsers) {
    const orgRows = memberships.get(user.id) ?? [];
    const tipo = assigneeTipo({
      appRoles: appRoles.get(user.id) ?? [],
      orgRoles: orgRows.map((row) => row.role),
    });
    if (!tipo) continue;
    if (
      !assigneeInScope({
        orgTablesReady: access.orgTablesReady,
        seeAllCadastros: access.seeAllCadastros,
        organizationIds: access.organizationIds,
        memberOrganizationIds: orgRows.map((row) => row.organization_id),
      })
    ) {
      continue;
    }
    const profile = profiles.get(user.id);
    const email = profile?.email?.trim() || user.email || "";
    users.push({
      id: user.id,
      nome: profile?.nome?.trim() || email || "Usuário",
      email,
      tipo,
    });
  }
  users.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "admin" ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
  return users;
}

async function assertAssigneeAllowed(access: CallerAccess, userId: string) {
  const users = await listAssignees(access);
  if (!users.some((user) => user.id === userId)) {
    throw new Error("Sem acesso a este usuário.");
  }
}

async function notifyClientTaskCompleted(
  taskId: string,
  titulo: string,
  cadastroClienteId: number,
) {
  const admin = getSupabaseAdmin();
  const { data: accessRows, error } = await admin
    .from("client_access")
    .select("user_id")
    .eq("cadastro_cliente_id", cadastroClienteId);
  if (error) throw new Error(error.message);
  const { data: cliente } = await admin
    .from("cadastro_clientes")
    .select("nome_cliente")
    .eq("id", cadastroClienteId)
    .maybeSingle();
  await insertAppNotifications(
    admin,
    (accessRows ?? []).map((row) => ({
      userId: row.user_id,
      kind: "cliente" as const,
      title: `Tarefa concluída: ${titulo}`,
      body: cliente?.nome_cliente
        ? `Entrega de ${cliente.nome_cliente} foi concluída.`
        : "A entrega foi concluída.",
      href: "/tarefas",
      payload: { taskId, cadastroClienteId },
    })),
  );
}

async function assigneeLabels(ids: Array<string | null | undefined>) {
  const nomes = new Map<string, string>();
  const wanted = ids.filter((id): id is string => Boolean(id));
  if (wanted.length === 0) return nomes;
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, nome, email")
    .in("id", wanted);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    nomes.set(row.id, row.nome?.trim() || row.email?.trim() || "Usuário");
  }
  return nomes;
}

export type DueTaskAlert = {
  id: string;
  titulo: string;
  entrega: string;
  clienteNome: string;
};

function missingTaskColumn(message: string): boolean {
  return (
    /aviso_entrega|recorrencia/i.test(message) &&
    /does not exist|schema cache|could not find/i.test(message)
  );
}

/** Marca o aviso do dia e devolve as tarefas do proprietário que vencem hoje. */
export async function syncDueTaskAlerts(userId?: string): Promise<DueTaskAlert[]> {
  const admin = getSupabaseAdmin();
  const today = todayInSaoPaulo();
  let query = admin
    .from("agency_tasks")
    .select("id, titulo, cadastro_cliente_id, due_at, responsavel_user_id, aviso_entrega, status")
    .eq("status", "open");
  if (userId) query = query.eq("responsavel_user_id", userId);
  const { data, error } = await query;
  if (error) {
    if (missingTaskColumn(error.message)) return syncDuePendenciaAlerts(userId);
    throw new Error(error.message);
  }

  const due = (data ?? []).filter(
    (row) => row.responsavel_user_id && dueAtToEntrega(row.due_at) === today,
  );
  if (due.length === 0) return syncDuePendenciaAlerts(userId);

  const cadastroIds = [...new Set(due.map((row) => row.cadastro_cliente_id))];
  const { data: clients } = await admin
    .from("cadastro_clientes")
    .select("id, nome_cliente")
    .in("id", cadastroIds);
  const nomes = new Map((clients ?? []).map((row) => [row.id, row.nome_cliente?.trim() || ""]));
  const alerts = due.map((row) => ({
    id: row.id,
    titulo: row.titulo,
    entrega: today,
    clienteNome: nomes.get(row.cadastro_cliente_id) ?? "",
  }));

  const fresh = due.filter((row) => row.aviso_entrega !== today);
  if (fresh.length === 0) {
    const pendencias = await syncDuePendenciaAlerts(userId);
    return [...alerts, ...pendencias];
  }

  const { error: markError } = await admin
    .from("agency_tasks")
    .update({ aviso_entrega: today })
    .in(
      "id",
      fresh.map((row) => row.id),
    );
  if (markError) {
    if (missingTaskColumn(markError.message)) return alerts;
    throw new Error(markError.message);
  }

  const ownerIds = [...new Set(fresh.map((row) => row.responsavel_user_id).filter(Boolean))];
  const { data: roles } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", ownerIds);
  const admins = new Set(
    (roles ?? []).filter((row) => row.role === "admin").map((row) => row.user_id),
  );
  await insertAppNotifications(
    admin,
    fresh.map((row) => ({
      userId: row.responsavel_user_id as string,
      kind: "tarefa" as const,
      title: `Tarefa para hoje: ${row.titulo}`,
      body: nomes.get(row.cadastro_cliente_id)
        ? `Entrega de ${nomes.get(row.cadastro_cliente_id)} chegou.`
        : "A data de entrega chegou.",
      href: admins.has(row.responsavel_user_id as string) ? "/admin/tarefas" : "/tarefas",
      payload: {
        taskId: row.id,
        entrega: today,
        cadastroClienteId: row.cadastro_cliente_id,
      },
    })),
  );
  const pendencias = await syncDuePendenciaAlerts(userId);
  return [...alerts, ...pendencias];
}

async function syncDuePendenciaAlerts(userId?: string): Promise<DueTaskAlert[]> {
  const admin = getSupabaseAdmin();
  const today = todayInSaoPaulo();
  const { data, error } = await admin
    .from("lots_pendencias")
    .select(
      "chave, titulo, cadastro_cliente_id, cliente_nome, entrega, responsavel_user_id, aviso_user_id, aviso_entrega, href",
    )
    .is("concluida_em", null)
    .eq("entrega", today);
  if (error) {
    if (/aviso_user_id|aviso_entrega|lots_pendencias/i.test(error.message)) return [];
    return [];
  }
  const due = (data ?? []).filter((row) => {
    const destino = row.aviso_user_id || row.responsavel_user_id;
    if (!destino) return false;
    if (userId && destino !== userId) return false;
    return row.aviso_entrega !== today;
  });
  if (due.length === 0) return [];
  const { error: markError } = await admin
    .from("lots_pendencias")
    .update({ aviso_entrega: today })
    .in(
      "chave",
      due.map((row) => row.chave),
    );
  if (markError) return [];
  await insertAppNotifications(
    admin,
    due.map((row) => {
      const destino = (row.aviso_user_id || row.responsavel_user_id) as string;
      return {
        userId: destino,
        kind: "tarefa" as const,
        title: `Tarefa para hoje: ${row.titulo}`,
        body: row.cliente_nome
          ? `Entrega de ${row.cliente_nome} chegou.`
          : "A data de entrega chegou.",
        href: row.href || "/admin/tarefas",
        payload: { chave: row.chave, entrega: today, cadastroClienteId: row.cadastro_cliente_id },
      };
    }),
  );
  return due.map((row) => ({
    id: row.chave,
    titulo: row.titulo,
    entrega: today,
    clienteNome: row.cliente_nome ?? "",
  }));
}

export const syncMyDueTaskAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => syncDueTaskAlerts(context.userId));
