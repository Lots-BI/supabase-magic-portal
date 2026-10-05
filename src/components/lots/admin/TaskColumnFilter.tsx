import { useMemo, useState } from "react";
import { ListFilter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TaskSheetTask } from "@/modules/agency-os/tasks-sheet";
import {
  columnKind,
  columnValueLabel,
  columnValues,
  filterIsActive,
  type ColumnFilter,
  type SheetSort,
  type TaskColumnId,
} from "./task-sheet-view";

const TEXT_CONDITIONS = [
  { value: "", label: "Nenhuma" },
  { value: "contains", label: "O texto contém" },
  { value: "not_contains", label: "O texto não contém" },
  { value: "exact", label: "O texto é exatamente" },
  { value: "starts", label: "Começa com" },
  { value: "ends", label: "Termina com" },
  { value: "empty", label: "Está vazio" },
  { value: "not_empty", label: "Não está vazio" },
];

const DATE_CONDITIONS = [
  { value: "", label: "Nenhuma" },
  { value: "on", label: "A data é" },
  { value: "before", label: "Antes de" },
  { value: "after", label: "Depois de" },
  { value: "empty", label: "Está vazio" },
  { value: "not_empty", label: "Não está vazio" },
];

export function TaskColumnFilter({
  column,
  title,
  tasks,
  sort,
  filter,
  onSort,
  onFilter,
  onClearSort,
}: {
  column: TaskColumnId;
  title: string;
  tasks: readonly TaskSheetTask[];
  sort: SheetSort;
  filter: ColumnFilter | undefined;
  onSort: (dir: "asc" | "desc") => void;
  onFilter: (next: ColumnFilter | null) => void;
  onClearSort: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [valueQuery, setValueQuery] = useState("");
  const kind = columnKind(column);
  const active = filterIsActive(filter) || sort?.column === column;
  const values = useMemo(() => columnValues(tasks, column), [tasks, column]);
  const shown = values.filter((value) =>
    columnValueLabel(column, value)
      .toLocaleLowerCase("pt-BR")
      .includes(valueQuery.trim().toLocaleLowerCase("pt-BR")),
  );
  const selected = filter?.values;
  const conditions = kind === "date" ? DATE_CONDITIONS : TEXT_CONDITIONS;
  const needsQuery = !["", "empty", "not_empty"].includes(filter?.condition ?? "");

  function toggleValue(value: string) {
    const current = selected ?? values;
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    const all = values.every((item) => next.includes(item));
    onFilter({
      condition: filter?.condition ?? "",
      query: filter?.query ?? "",
      values: all ? null : next,
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filtrar ${title}`}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground",
            active && "text-primary",
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[80] w-72 p-0">
        <div className="flex flex-col text-sm">
          <button
            type="button"
            className="px-3 py-2 text-left hover:bg-accent"
            onClick={() => onSort("asc")}
          >
            {kind === "date" ? "Classificar da mais antiga" : "Classificar A → Z"}
          </button>
          <button
            type="button"
            className="px-3 py-2 text-left hover:bg-accent"
            onClick={() => onSort("desc")}
          >
            {kind === "date" ? "Classificar da mais recente" : "Classificar Z → A"}
          </button>
          <div className="space-y-2 border-t border-muted px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Filtrar por condição
            </p>
            <select
              aria-label={`Condição de ${title}`}
              className="h-8 w-full rounded-md border border-muted bg-background px-2 text-[13px]"
              value={filter?.condition ?? ""}
              onChange={(event) =>
                onFilter({
                  condition: event.target.value,
                  query: filter?.query ?? "",
                  values: filter?.values ?? null,
                })
              }
            >
              {conditions.map((item) => (
                <option key={item.value || "none"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {needsQuery ? (
              <input
                value={filter?.query ?? ""}
                placeholder={kind === "date" ? "dd/mm/aaaa" : "Termo"}
                aria-label={`Termo de ${title}`}
                className="h-8 w-full rounded-md border border-muted bg-background px-2 text-[13px]"
                onChange={(event) =>
                  onFilter({
                    condition: filter?.condition ?? "contains",
                    query: event.target.value,
                    values: filter?.values ?? null,
                  })
                }
              />
            ) : null}
          </div>
          <div className="space-y-2 border-t border-muted px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Filtrar por valores
            </p>
            <input
              value={valueQuery}
              placeholder="Pesquisar valores"
              aria-label={`Pesquisar valores de ${title}`}
              className="h-8 w-full rounded-md border border-muted bg-background px-2 text-[13px]"
              onChange={(event) => setValueQuery(event.target.value)}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected == null}
                onChange={() =>
                  onFilter(
                    selected == null
                      ? {
                          condition: filter?.condition ?? "",
                          query: filter?.query ?? "",
                          values: [],
                        }
                      : {
                          condition: filter?.condition ?? "",
                          query: filter?.query ?? "",
                          values: null,
                        },
                  )
                }
              />
              Selecionar tudo
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {shown.map((value) => (
                <label key={value || "empty"} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected == null || selected.includes(value)}
                    onChange={() => toggleValue(value)}
                  />
                  <span className="truncate">{columnValueLabel(column, value)}</span>
                </label>
              ))}
            </div>
          </div>
          {active ? (
            <button
              type="button"
              className="border-t border-muted px-3 py-2 text-left text-primary hover:bg-accent"
              onClick={() => {
                onClearSort();
                onFilter(null);
                setValueQuery("");
              }}
            >
              Limpar filtro
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
