import {
  isoToBrDate,
  recurrenceLabel,
  TASK_SHEET_ABAS,
  TASK_SHEET_STATUSES,
  type TaskSheetTask,
} from "@/modules/agency-os/tasks-sheet";

export const TASK_COLUMNS = [
  { id: "titulo", label: "Tarefa", kind: "text" },
  { id: "cliente", label: "Cliente", kind: "text" },
  { id: "proprietario", label: "Proprietário", kind: "text" },
  { id: "entrega", label: "Entrega", kind: "date" },
  { id: "status", label: "Status", kind: "text" },
  { id: "aba", label: "Aba", kind: "text" },
  { id: "repete", label: "Repete", kind: "text" },
] as const;

export type TaskColumnId = (typeof TASK_COLUMNS)[number]["id"];
export type TaskColumnKind = (typeof TASK_COLUMNS)[number]["kind"];

export type TextCondition =
  | "contains"
  | "not_contains"
  | "exact"
  | "starts"
  | "ends"
  | "empty"
  | "not_empty";

export type DateCondition = "on" | "before" | "after" | "empty" | "not_empty";

export type ColumnFilter = {
  condition: string;
  query: string;
  /** null = todos os valores da coluna. */
  values: string[] | null;
};

export type SheetSort = { column: TaskColumnId; dir: "asc" | "desc" } | null;

const EMPTY = "(Vazias)";

export function columnKind(column: TaskColumnId): TaskColumnKind {
  return TASK_COLUMNS.find((item) => item.id === column)?.kind ?? "text";
}

export function taskColumnRaw(task: TaskSheetTask, column: TaskColumnId): string {
  if (column === "titulo") return task.titulo;
  if (column === "cliente") return task.cliente_nome;
  if (column === "proprietario") return task.responsavel_nome ?? "";
  if (column === "entrega") return task.entrega;
  if (column === "status") {
    return TASK_SHEET_STATUSES.find((item) => item.value === task.status)?.label ?? task.status;
  }
  if (column === "aba") return TASK_SHEET_ABAS.find((item) => item.value === task.aba)?.label ?? "";
  return recurrenceLabel(task.repete);
}

export function taskColumnLabel(task: TaskSheetTask, column: TaskColumnId): string {
  const raw = taskColumnRaw(task, column);
  if (!raw) return EMPTY;
  if (column === "entrega") return isoToBrDate(raw) || raw;
  return raw;
}

export function columnValues(tasks: readonly TaskSheetTask[], column: TaskColumnId): string[] {
  const values = new Set(tasks.map((task) => taskColumnRaw(task, column)));
  return [...values].sort((a, b) => compareColumn(a, b, column));
}

export function columnValueLabel(column: TaskColumnId, value: string): string {
  if (!value) return EMPTY;
  if (column === "entrega") return isoToBrDate(value) || value;
  return value;
}

function compareColumn(a: string, b: string, column: TaskColumnId): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  if (column === "entrega") return a.localeCompare(b);
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

function matchesCondition(
  raw: string,
  label: string,
  column: TaskColumnId,
  filter: ColumnFilter,
): boolean {
  const condition = filter.condition;
  if (!condition) return true;
  if (condition === "empty") return raw === "";
  if (condition === "not_empty") return raw !== "";
  const query = filter.query.trim();
  if (!query && condition !== "empty" && condition !== "not_empty") return true;

  if (column === "entrega") {
    if (condition === "on") return label === query || raw === query;
    if (condition === "before") return raw !== "" && raw < normalizeDateQuery(query);
    if (condition === "after") return raw !== "" && raw > normalizeDateQuery(query);
    return true;
  }

  if (condition === "exact") return label === query;
  const haystack = label.toLocaleLowerCase("pt-BR");
  const needle = query.toLocaleLowerCase("pt-BR");
  if (condition === "contains") return haystack.includes(needle);
  if (condition === "not_contains") return !haystack.includes(needle);
  if (condition === "starts") return haystack.startsWith(needle);
  if (condition === "ends") return haystack.endsWith(needle);
  return true;
}

function normalizeDateQuery(query: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(query.trim());
  if (!match) return query;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function matchesValues(raw: string, filter: ColumnFilter | undefined): boolean {
  if (!filter || filter.values == null) return true;
  return filter.values.includes(raw);
}

export function filterIsActive(filter: ColumnFilter | undefined): boolean {
  if (!filter) return false;
  if (filter.values != null) return true;
  return Boolean(filter.condition);
}

export function applyTaskSheetView(
  tasks: readonly TaskSheetTask[],
  sort: SheetSort,
  filters: Partial<Record<TaskColumnId, ColumnFilter>>,
): TaskSheetTask[] {
  const filtered = tasks.filter((task) =>
    TASK_COLUMNS.every((column) => {
      const filter = filters[column.id];
      if (!filter) return true;
      const raw = taskColumnRaw(task, column.id);
      const label = taskColumnLabel(task, column.id);
      return matchesCondition(raw, label, column.id, filter) && matchesValues(raw, filter);
    }),
  );

  if (!sort) {
    return [...filtered].sort((a, b) => {
      if (a.entrega !== b.entrega) {
        if (!a.entrega) return 1;
        if (!b.entrega) return -1;
        return a.entrega.localeCompare(b.entrega);
      }
      return a.titulo.localeCompare(b.titulo, "pt-BR");
    });
  }

  const dir = sort.dir === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => {
    const rawA = taskColumnRaw(a, sort.column);
    const rawB = taskColumnRaw(b, sort.column);
    if (!rawA || !rawB) {
      if (!rawA && !rawB) return a.titulo.localeCompare(b.titulo, "pt-BR");
      return !rawA ? 1 : -1;
    }
    const compared = compareColumn(rawA, rawB, sort.column);
    if (compared === 0) return a.titulo.localeCompare(b.titulo, "pt-BR");
    return compared * dir;
  });
}
