import { slugify } from "@/lib/slug";

/** Status já gravado em agency_tasks — a planilha só traduz o rótulo. */
export const TASK_SHEET_STATUSES = [
  { value: "open", label: "Aberta" },
  { value: "completed", label: "Entregue" },
  { value: "cancelled", label: "Cancelada" },
] as const;

export type TaskSheetStatus = (typeof TASK_SHEET_STATUSES)[number]["value"];

/** Aba da Lots BI onde a tarefa é feita. O rótulo do botão diz a ação. */
export const TASK_SHEET_ABAS = [
  { value: "conteudos", label: "Conteúdos", action: "Aprovar conteúdo" },
  { value: "crm", label: "CRM", action: "Abrir CRM" },
  { value: "relatorio", label: "Relatório", action: "Ver relatório" },
  { value: "diretrizes", label: "Diretrizes da Marca", action: "Ver diretrizes" },
  { value: "conexoes", label: "Conexões", action: "Abrir conexões" },
] as const;

export type TaskSheetAba = (typeof TASK_SHEET_ABAS)[number]["value"];

export type TaskSheetClient = {
  id: number;
  nome: string;
  ativo: boolean;
};

export type TaskSheetUser = {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "cliente";
};

export type TaskSheetTask = {
  id: string;
  titulo: string;
  cadastro_cliente_id: number;
  cliente_nome: string;
  entrega: string;
  status: TaskSheetStatus;
  descricao: string | null;
  responsavel_user_id: string | null;
  responsavel_nome: string | null;
  aba: TaskSheetAba | null;
  /** `semanal:1` = toda segunda. Null = não repete. */
  repete: string | null;
  concluida_em: string | null;
};

/** Admin da plataforma ou da agência; cliente final continua cliente. */
export function assigneeTipo(input: {
  appRoles: readonly string[];
  orgRoles: readonly string[];
}): "admin" | "cliente" | null {
  const staff = input.orgRoles.some((role) => role !== "cliente");
  if (input.appRoles.includes("admin") || staff) return "admin";
  if (input.appRoles.includes("cliente") || input.orgRoles.includes("cliente")) return "cliente";
  return null;
}

/** Sem organização pronta, ou com visão global, qualquer admin/cliente. Com o SaaS, só a org. */
export function assigneeInScope(input: {
  orgTablesReady: boolean;
  seeAllCadastros: boolean;
  organizationIds: readonly string[];
  memberOrganizationIds: readonly string[];
}): boolean {
  if (!input.orgTablesReady || input.seeAllCadastros) return true;
  if (input.organizationIds.length === 0) return false;
  return input.memberOrganizationIds.some((id) => input.organizationIds.includes(id));
}

/** HTML vazio do editor vira null. Texto com marca permanece. */
export function normalizeTaskDescription(html: string | null | undefined): string | null {
  if (!html) return null;
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return html.trim();
}

const ENTREGA = /^\d{4}-\d{2}-\d{2}$/;
const ENTREGA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Dia/mês/ano, como se escreve em São Paulo. O banco continua em ano-mês-dia. */
export function isoToBrDate(iso: string | null | undefined): string {
  if (!iso || !ENTREGA.test(iso)) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Mantém só os dígitos e insere as barras: 02102026 → 02/10/2026. */
export function maskBrDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Data completa e real no calendário. Incompleta ou impossível devolve null. */
export function brDateToIso(text: string): string | null {
  const match = ENTREGA_BR.exec(text);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Sem tabelas de organização, ou com visão global, a lista segue o RLS
 * atual (admin da plataforma). Com o SaaS ligado, só os cadastros da org.
 * null = não filtrar de novo na aplicação.
 */
export function visibleCadastroIds(access: {
  orgTablesReady: boolean;
  seeAllCadastros: boolean;
  cadastroIds: readonly number[];
}): number[] | null {
  if (!access.orgTablesReady || access.seeAllCadastros) return null;
  return [...access.cadastroIds];
}

/** Meio-dia em São Paulo, para o dia escolhido não voltar na virada do UTC. */
export function entregaToDueAt(entrega: string | null | undefined): string | null {
  if (entrega == null || entrega === "") return null;
  if (!ENTREGA.test(entrega)) throw new Error("Data de entrega inválida.");
  return `${entrega}T15:00:00.000Z`;
}

export function dueAtToEntrega(dueAt: string | null | undefined): string {
  if (!dueAt) return "";
  const datePart = dueAt.slice(0, 10);
  if (ENTREGA.test(datePart) && (dueAt.length === 10 || dueAt.includes("T15:00:00"))) {
    return datePart;
  }
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function isTaskSheetStatus(value: string): value is TaskSheetStatus {
  return TASK_SHEET_STATUSES.some((status) => status.value === value);
}

export function isTaskSheetAba(value: string | null | undefined): value is TaskSheetAba {
  return TASK_SHEET_ABAS.some((aba) => aba.value === value);
}

export function taskAbaAction(aba: TaskSheetAba): string {
  return TASK_SHEET_ABAS.find((item) => item.value === aba)?.action ?? "Abrir";
}

/** Caminho da aba escolhida. Admin fica no painel; cliente entra no próprio cadastro. */
export function taskAbaHref(
  aba: TaskSheetAba,
  side: "admin" | "cliente",
  clienteNome: string,
): string | null {
  if (side === "admin") {
    if (aba === "conteudos") return "/admin/aprovacoes";
    if (aba === "crm") return "/admin/crm";
    if (aba === "relatorio") return "/admin/relatorios";
    if (aba === "diretrizes") return "/admin/brandbook";
    return "/admin/conexoes";
  }
  const slug = slugify(clienteNome);
  if (!slug) return null;
  if (aba === "conteudos") return `/cliente/${slug}/aprovacoes`;
  if (aba === "crm") return `/cliente/${slug}/crm`;
  if (aba === "relatorio") return `/cliente/${slug}/relatorio`;
  if (aba === "diretrizes") return `/cliente/${slug}/brandbook`;
  return `/cliente/${slug}/conexoes`;
}

export function isEntregaAtrasada(
  entrega: string,
  status: TaskSheetStatus,
  today: string,
): boolean {
  return status === "open" && entrega !== "" && entrega < today;
}

/**
 * Tarefa aberta com a entrega mais próxima de hoje.
 * Primeiro a próxima data; se todas já passaram, a vencida mais recente.
 */
export function nearestDeliveryTask<T extends { status: string; entrega: string }>(
  tasks: readonly T[],
  today: string,
): T | null {
  const open = tasks.filter((task) => task.status === "open");
  const dated = open.filter((task) => task.entrega);
  const upcoming = dated
    .filter((task) => task.entrega >= today)
    .sort((a, b) => a.entrega.localeCompare(b.entrega));
  if (upcoming[0]) return upcoming[0];
  const overdue = dated
    .filter((task) => task.entrega < today)
    .sort((a, b) => b.entrega.localeCompare(a.entrega));
  if (overdue[0]) return overdue[0];
  return open[0] ?? null;
}

export const WEEKDAY_LABELS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

export type TaskRecurrence = { recorrencia: "semanal"; dia: number };

export function parseRepete(value: string | null | undefined): TaskRecurrence | null {
  const match = /^semanal:([0-6])$/.exec(value ?? "");
  if (!match) return null;
  return { recorrencia: "semanal", dia: Number(match[1]) };
}

export function formatRepete(
  recorrencia: string | null | undefined,
  dia: number | null | undefined,
): string | null {
  if (recorrencia !== "semanal" || dia == null || dia < 0 || dia > 6) return null;
  return `semanal:${dia}`;
}

export function recurrenceLabel(repete: string | null | undefined): string {
  const parsed = parseRepete(repete);
  if (!parsed) return "";
  return `Toda ${WEEKDAY_LABELS[parsed.dia]}`;
}

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Próxima data estritamente depois de `fromIso` nesse dia da semana (0 = domingo). */
export function nextWeeklyEntrega(fromIso: string, weekday: number): string {
  const start = utcDate(fromIso);
  for (let step = 1; step <= 7; step += 1) {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + step);
    if (next.getUTCDay() === weekday) return formatUtc(next);
  }
  return fromIso;
}

/** Hoje, se já é o dia; senão a próxima ocorrência. */
export function upcomingWeeklyEntrega(today: string, weekday: number): string {
  const start = utcDate(today);
  for (let step = 0; step <= 6; step += 1) {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + step);
    if (next.getUTCDay() === weekday) return formatUtc(next);
  }
  return today;
}

export function todayInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
