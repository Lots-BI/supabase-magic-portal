import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { focusAdjacentSheetCell } from "@/components/lots/admin/sheet-cell-focus";
import { SheetOptionPicker, type SheetPickOption } from "@/components/lots/admin/SheetOptionPicker";
import { LotsPendenciasBoard } from "@/components/lots/admin/LotsPendenciasBoard";
import { TaskColumnFilter } from "@/components/lots/admin/TaskColumnFilter";
import { ColumnResizeHandle } from "@/components/lots/admin/ColumnResizeHandle";
import { useSheetColumnWidths } from "@/components/lots/admin/sheet-column-resize";
import { taskSheetQuery } from "@/components/lots/admin/task-sheet-query";
import {
  applyTaskSheetView,
  filterIsActive,
  type ColumnFilter,
  type SheetSort,
  type TaskColumnId,
} from "@/components/lots/admin/task-sheet-view";
import { RoteiroHtmlEditor } from "@/components/lots/approval/roteiro/RoteiroHtmlEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteTaskSheet, saveTaskSheet } from "@/modules/agency-os/tasks-sheet.server";
import { slugify } from "@/lib/slug";
import {
  brDateToIso,
  isEntregaAtrasada,
  isoToBrDate,
  isTaskSheetAba,
  maskBrDate,
  TASK_SHEET_ABAS,
  TASK_SHEET_STATUSES,
  taskAbaAction,
  todayInSaoPaulo,
  upcomingWeeklyEntrega,
  WEEKDAY_LABELS,
  type TaskSheetAba,
  type TaskSheetClient,
  type TaskSheetStatus,
  type TaskSheetTask,
  type TaskSheetUser,
} from "@/modules/agency-os/tasks-sheet";
import { cn } from "@/lib/utils";

type SheetData = {
  clients: TaskSheetClient[];
  tasks: TaskSheetTask[];
  users: TaskSheetUser[];
};

type Draft = {
  titulo: string;
  cadastro_cliente_id: number | "";
  responsavel_user_id: string;
  entrega: string;
  status: TaskSheetStatus;
  aba: TaskSheetAba | "";
  repete: string;
  id: string | null;
};

const emptyDraft = (): Draft => ({
  titulo: "",
  cadastro_cliente_id: "",
  responsavel_user_id: "",
  entrega: "",
  status: "open",
  aba: "",
  repete: "",
  id: null,
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar.";
}

function compareTasks(a: TaskSheetTask, b: TaskSheetTask) {
  if (a.entrega !== b.entrega) {
    if (!a.entrega) return 1;
    if (!b.entrega) return -1;
    return a.entrega.localeCompare(b.entrega);
  }
  return a.titulo.localeCompare(b.titulo, "pt-BR");
}

function optionsFor(clients: TaskSheetClient[], selectedId: number | null, selectedNome?: string) {
  const options = clients.filter((client) => client.ativo || client.id === selectedId);
  if (selectedId != null && !options.some((client) => client.id === selectedId)) {
    return [
      { id: selectedId, nome: selectedNome || `Cliente ${selectedId}`, ativo: false },
      ...options,
    ];
  }
  return options;
}

const fieldClass =
  "h-9 w-full min-w-0 bg-transparent px-2 text-[13px] leading-9 text-foreground outline-none placeholder:text-muted-foreground focus-visible:relative focus-visible:z-10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [color-scheme:light] dark:[color-scheme:dark]";

export function TaskSheet() {
  const queryClient = useQueryClient();
  const today = todayInSaoPaulo();
  const draftTitleRef = useRef<HTMLInputElement>(null);
  const draftRowRef = useRef<HTMLTableRowElement>(null);
  const draftIdRef = useRef<string | null>(null);
  const pendingDraft = useRef<Draft | null>(null);
  const flushingDraft = useRef(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [sort, setSort] = useState<SheetSort>(null);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<TaskColumnId, ColumnFilter>>>(
    {},
  );
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLocked, setDetailLocked] = useState(false);
  const [draftEditing, setDraftEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const columns = useSheetColumnWidths(
    "lots-sheet-tarefas",
    [40, 280, 176, 176, 144, 128, 160, 192],
  );

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      if (!draftIdRef.current) return;
      const target = event.target;
      const row = draftRowRef.current;
      if (!(target instanceof Element) || !row) return;
      const cell = target.closest("[data-sheet-cell]");
      if (!cell || row.contains(cell)) return;
      draftIdRef.current = null;
      setDraft(emptyDraft());
      setDraftEditing(false);
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  const sheet = useQuery(taskSheetQuery);

  const save = useMutation({
    mutationFn: (input: {
      id?: string;
      titulo: string;
      cadastro_cliente_id: number;
      entrega: string | null;
      status: TaskSheetStatus;
      descricao?: string | null;
      responsavel_user_id?: string | null;
      aba?: TaskSheetAba | null;
      repete?: string | null;
    }) => saveTaskSheet({ data: input }),
    onSuccess: (task) => {
      queryClient.setQueryData<SheetData>(taskSheetQuery.queryKey, (current) => {
        if (!current) return current;
        const tasks = [...current.tasks.filter((row) => row.id !== task.id), task].sort(
          compareTasks,
        );
        return { ...current, tasks };
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteTaskSheet({ data: { ids } }),
    onSuccess: ({ ids }) => {
      const gone = new Set(ids);
      setSelected((current) => current.filter((id) => !gone.has(id)));
      queryClient.setQueryData<SheetData>(taskSheetQuery.queryKey, (current) =>
        current ? { ...current, tasks: current.tasks.filter((row) => !gone.has(row.id)) } : current,
      );
      void queryClient.invalidateQueries({ queryKey: taskSheetQuery.queryKey });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (sheet.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando planilha…</p>;
  }
  if (sheet.error) {
    return <p className="text-sm text-destructive">{errorMessage(sheet.error)}</p>;
  }

  const clients = sheet.data?.clients ?? [];
  const tasks = sheet.data?.tasks ?? [];
  const users = sheet.data?.users ?? [];
  const listed = tasks.filter((task) => task.id !== draft.id && task.status !== "completed");
  const entregues = tasks.filter((task) => task.status === "completed");
  const visible = applyTaskSheetView(listed, sort, columnFilters);
  const filtersActive = (Object.keys(columnFilters) as TaskColumnId[]).some((column) =>
    filterIsActive(columnFilters[column]),
  );
  const abertas = tasks.filter((task) => task.status === "open").length;
  const detail = tasks.find((task) => task.id === detailId) ?? null;

  function startNewLine() {
    draftIdRef.current = null;
    pendingDraft.current = null;
    setDraft(emptyDraft());
    setDraftEditing(true);
    draftTitleRef.current?.focus();
  }

  async function commitDraft(next: Draft) {
    const titulo = next.titulo.trim();
    if (!titulo || next.cadastro_cliente_id === "") return;
    pendingDraft.current = { ...next, titulo };
    if (flushingDraft.current) return;
    flushingDraft.current = true;
    try {
      while (pendingDraft.current) {
        const snapshot = pendingDraft.current;
        pendingDraft.current = null;
        if (!snapshot.titulo.trim() || snapshot.cadastro_cliente_id === "") continue;
        const saved = await save.mutateAsync({
          id: draftIdRef.current ?? undefined,
          titulo: snapshot.titulo.trim(),
          cadastro_cliente_id: snapshot.cadastro_cliente_id,
          entrega: snapshot.entrega || null,
          status: snapshot.status,
          responsavel_user_id: snapshot.responsavel_user_id || null,
          aba: snapshot.aba || null,
          repete: snapshot.repete || null,
        });
        draftIdRef.current = saved.id;
        setDraft((current) => ({ ...current, id: saved.id }));
      }
    } catch {
      // O toast fica no onError da mutation.
    } finally {
      flushingDraft.current = false;
    }
  }

  return (
    <>
      <div className="lots-surface overflow-hidden border border-muted">
        <div className="flex flex-wrap items-center gap-3 border-b border-muted px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {abertas} {abertas === 1 ? "aberta" : "abertas"}
            {tasks.length !== abertas ? ` · ${tasks.length} no total` : ""}
            {filtersActive ? ` · ${visible.length} na filtragem` : ""}
          </p>
          {selected.length > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                const count = selected.length;
                const label = count === 1 ? "Excluir esta tarefa?" : `Excluir ${count} tarefas?`;
                if (!window.confirm(label)) return;
                remove.mutate(selected);
              }}
            >
              Excluir{selected.length > 1 ? ` (${selected.length})` : ""}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={startNewLine}
          >
            Nova linha
          </Button>
        </div>

        {clients.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">
            Nenhum cliente neste acesso. A tarefa precisa de um cliente da organização.
          </p>
        ) : null}

        <div className="lots-table-scroll">
          <table
            className="table-fixed border-collapse text-[13px]"
            style={{ width: columns.widths.reduce((sum, width) => sum + width, 0) }}
          >
            <colgroup>
              {columns.widths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-muted">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <th className="relative border border-muted px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label="Selecionar tarefas visíveis"
                    checked={
                      visible.length > 0 && visible.every((task) => selected.includes(task.id))
                    }
                    onChange={(event) => {
                      const ids = visible.map((task) => task.id);
                      setSelected((current) =>
                        event.target.checked
                          ? [...new Set([...current, ...ids])]
                          : current.filter((id) => !ids.includes(id)),
                      );
                    }}
                  />
                  <ColumnResizeHandle
                    label="seleção"
                    onPointerDown={(event) => columns.startResize(0, event)}
                  />
                </th>
                {(
                  [
                    ["titulo", "Tarefa"],
                    ["cliente", "Cliente"],
                    ["proprietario", "Proprietário"],
                    ["entrega", "Entrega"],
                    ["status", "Status"],
                    ["aba", "Aba"],
                    ["repete", "Repete"],
                  ] as const
                ).map(([column, label], index) => (
                  <th key={column} className="relative border border-muted px-2 py-2">
                    <span className="flex items-center justify-between gap-1 pr-1">
                      {label}
                      <TaskColumnFilter
                        column={column}
                        title={label}
                        tasks={listed}
                        sort={sort}
                        filter={columnFilters[column]}
                        onSort={(dir) => setSort({ column, dir })}
                        onClearSort={() =>
                          setSort((current) => (current?.column === column ? null : current))
                        }
                        onFilter={(next) =>
                          setColumnFilters((current) => {
                            const copy = { ...current };
                            if (!next || (!next.condition && next.values == null && !next.query)) {
                              delete copy[column];
                            } else {
                              copy[column] = next;
                            }
                            return copy;
                          })
                        }
                      />
                    </span>
                    <ColumnResizeHandle
                      label={label}
                      onPointerDown={(event) => columns.startResize(index + 1, event)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((task, index) => (
                <TaskRow
                  key={task.id}
                  index={index + 1}
                  task={task}
                  clients={clients}
                  users={users}
                  today={today}
                  selected={selected.includes(task.id)}
                  onSelectedChange={(checked) =>
                    setSelected((current) =>
                      checked ? [...current, task.id] : current.filter((id) => id !== task.id),
                    )
                  }
                  onOpen={() => {
                    setDetailLocked(!selected.includes(task.id));
                    setDetailId(task.id);
                  }}
                  onSave={(patch) => save.mutate({ id: task.id, ...patch })}
                />
              ))}
              {filtersActive && visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-muted px-3 py-6 text-center text-muted-foreground"
                  >
                    Nenhuma tarefa com esse filtro.
                  </td>
                </tr>
              ) : null}
              <tr ref={draftRowRef} className="bg-muted/30">
                <td className="border border-muted bg-muted/40 text-center">
                  <input
                    type="checkbox"
                    aria-label="Editar nova tarefa"
                    checked={draftEditing}
                    onChange={(event) => setDraftEditing(event.target.checked)}
                  />
                </td>
                <td className="border border-muted p-0">
                  {draftEditing ? (
                    <input
                      ref={draftTitleRef}
                      value={draft.titulo}
                      placeholder="Nova tarefa"
                      aria-label="Nova tarefa"
                      data-sheet-cell=""
                      className={fieldClass}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, titulo: event.target.value }))
                      }
                      onBlur={(event) => void commitDraft({ ...draft, titulo: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        event.currentTarget.blur();
                        focusAdjacentSheetCell(event.currentTarget, 1);
                      }}
                    />
                  ) : (
                    <span className="flex h-9 items-center px-2 text-[13px] text-muted-foreground">
                      Nova tarefa
                    </span>
                  )}
                </td>
                <td className="overflow-hidden border border-muted p-0">
                  <SheetOptionPicker
                    locked={!draftEditing}
                    value={
                      draft.cadastro_cliente_id === "" ? "" : String(draft.cadastro_cliente_id)
                    }
                    options={clientPickOptions(optionsFor(clients, null))}
                    placeholder="Cliente"
                    searchPlaceholder="Pesquisar cliente…"
                    emptyText="Nenhum cliente encontrado."
                    label="Cliente da nova tarefa"
                    onChange={(next) => {
                      const cadastro_cliente_id = next ? Number(next) : "";
                      const row = { ...draft, cadastro_cliente_id };
                      setDraft(row);
                      void commitDraft(row);
                    }}
                  />
                </td>
                <td className="overflow-hidden border border-muted p-0">
                  <SheetOptionPicker
                    locked={!draftEditing}
                    value={draft.responsavel_user_id}
                    options={userPickOptions(users, null, null)}
                    placeholder="Proprietário"
                    searchPlaceholder="Pesquisar usuário…"
                    emptyText="Nenhum usuário encontrado."
                    label="Proprietário da nova tarefa"
                    allowEmpty
                    emptyLabel="Sem proprietário"
                    onChange={(responsavel_user_id) => {
                      const row = { ...draft, responsavel_user_id };
                      setDraft(row);
                      void commitDraft(row);
                    }}
                  />
                </td>
                <td className="border border-muted p-0">
                  <EntregaInput
                    locked={!draftEditing}
                    iso={draft.entrega}
                    label="Entrega da nova tarefa"
                    onCommit={(entrega) => {
                      const next = { ...draft, entrega };
                      setDraft(next);
                      void commitDraft(next);
                    }}
                  />
                </td>
                <td className="overflow-hidden border border-muted p-0">
                  <SheetOptionPicker
                    locked={!draftEditing}
                    value={draft.status}
                    options={statusPickOptions()}
                    placeholder="Status"
                    searchPlaceholder="Pesquisar status…"
                    emptyText="Nenhum status encontrado."
                    label="Status da nova tarefa"
                    triggerClassName={statusTone(draft.status)}
                    onChange={(status) => {
                      const next = { ...draft, status: status as TaskSheetStatus };
                      setDraft(next);
                      void commitDraft(next);
                    }}
                  />
                </td>
                <td className="overflow-hidden border border-muted p-0">
                  <SheetOptionPicker
                    locked={!draftEditing}
                    value={draft.aba}
                    options={abaPickOptions()}
                    placeholder="Aba"
                    searchPlaceholder="Pesquisar aba…"
                    emptyText="Nenhuma aba encontrada."
                    label="Aba da nova tarefa"
                    allowEmpty
                    emptyLabel="Sem aba"
                    onChange={(aba) => {
                      const next = {
                        ...draft,
                        aba: isTaskSheetAba(aba) ? aba : "",
                      };
                      setDraft(next);
                      void commitDraft(next);
                    }}
                  />
                </td>
                <td className="overflow-hidden border border-muted p-0">
                  <SheetOptionPicker
                    locked={!draftEditing}
                    value={draft.repete}
                    options={repetePickOptions()}
                    placeholder="Não repete"
                    searchPlaceholder="Pesquisar período…"
                    emptyText="Nenhum período encontrado."
                    label="Repetição da nova tarefa"
                    allowEmpty
                    emptyLabel="Não repete"
                    onChange={(repete) => {
                      const next = { ...draft, repete };
                      const dia = parseRepeteDay(repete);
                      if (!next.entrega && dia != null) {
                        next.entrega = upcomingWeeklyEntrega(today, dia);
                      }
                      setDraft(next);
                      void commitDraft(next);
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <LotsPendenciasBoard entregues={entregues} clients={clients} users={users} editable />
      <TaskDescriptionDialog
        task={detail}
        saving={save.isPending}
        readOnly={detailLocked}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onSave={async (titulo, descricao) => {
          if (!detail) return;
          await save.mutateAsync({
            id: detail.id,
            titulo,
            cadastro_cliente_id: detail.cadastro_cliente_id,
            entrega: detail.entrega || null,
            status: detail.status,
            descricao,
          });
          setDetailId(null);
        }}
      />
    </>
  );
}

function TaskRow({
  index,
  task,
  clients,
  users,
  today,
  selected,
  onSelectedChange,
  onOpen,
  onSave,
}: {
  index: number;
  task: TaskSheetTask;
  clients: TaskSheetClient[];
  users: TaskSheetUser[];
  today: string;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onOpen: () => void;
  onSave: (patch: {
    titulo: string;
    cadastro_cliente_id: number;
    entrega: string | null;
    status: TaskSheetStatus;
    responsavel_user_id?: string | null;
    aba?: TaskSheetAba | null;
    repete?: string | null;
  }) => void;
}) {
  const late = isEntregaAtrasada(task.entrega, task.status, today);
  const options = optionsFor(clients, task.cadastro_cliente_id, task.cliente_nome);

  function persist(
    patch: Partial<{
      cadastro_cliente_id: number;
      entrega: string;
      status: TaskSheetStatus;
      responsavel_user_id: string | null;
      aba: TaskSheetAba | null;
      repete: string | null;
    }>,
  ) {
    onSave({
      titulo: task.titulo,
      cadastro_cliente_id: patch.cadastro_cliente_id ?? task.cadastro_cliente_id,
      entrega: patch.entrega === undefined ? task.entrega || null : patch.entrega || null,
      status: patch.status ?? task.status,
      ...(patch.responsavel_user_id !== undefined
        ? { responsavel_user_id: patch.responsavel_user_id }
        : {}),
      ...(patch.aba !== undefined ? { aba: patch.aba } : {}),
      ...(patch.repete !== undefined ? { repete: patch.repete } : {}),
    });
  }

  return (
    <tr className={cn("bg-card", selected && "bg-primary/5")}>
      <td className="border border-muted bg-muted/40 text-center">
        <input
          type="checkbox"
          aria-label={`Selecionar ${task.titulo}`}
          checked={selected}
          onChange={(event) => onSelectedChange(event.target.checked)}
        />
      </td>
      <td className="border border-muted p-0">
        <button
          type="button"
          aria-label={`Abrir descrição de ${task.titulo}`}
          data-sheet-cell=""
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-2 px-2 text-left text-[13px] outline-none hover:bg-primary/10 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            task.status === "cancelled" && "text-muted-foreground line-through",
          )}
          onClick={onOpen}
        >
          <span className="truncate">{task.titulo}</span>
          {task.descricao ? (
            <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-primary">
              nota
            </span>
          ) : null}
        </button>
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!selected}
          value={String(task.cadastro_cliente_id)}
          options={clientPickOptions(options)}
          placeholder="Cliente"
          searchPlaceholder="Pesquisar cliente…"
          emptyText="Nenhum cliente encontrado."
          label={`Cliente da tarefa ${index}`}
          onChange={(next) => {
            if (!next) return;
            persist({ cadastro_cliente_id: Number(next) });
          }}
        />
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!selected}
          value={task.responsavel_user_id ?? ""}
          options={userPickOptions(users, task.responsavel_user_id, task.responsavel_nome)}
          placeholder="Proprietário"
          searchPlaceholder="Pesquisar usuário…"
          emptyText="Nenhum usuário encontrado."
          label={`Proprietário da tarefa ${index}`}
          allowEmpty
          emptyLabel="Sem proprietário"
          onChange={(next) => persist({ responsavel_user_id: next || null })}
        />
      </td>
      <td className="border border-muted p-0">
        <EntregaInput
          locked={!selected}
          iso={task.entrega}
          late={late}
          label={`Entrega da tarefa ${index}`}
          onCommit={(entrega) => persist({ entrega })}
        />
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!selected}
          value={task.status}
          options={statusPickOptions()}
          placeholder="Status"
          searchPlaceholder="Pesquisar status…"
          emptyText="Nenhum status encontrado."
          label={`Status da tarefa ${index}`}
          triggerClassName={statusTone(task.status)}
          onChange={(status) => persist({ status: status as TaskSheetStatus })}
        />
      </td>
      <td className="overflow-hidden border border-muted p-0">
        {!selected ? (
          <div className="flex h-9 items-center px-2">
            {task.aba ? (
              <TaskAbaLink aba={task.aba} side="admin" clienteNome={task.cliente_nome} />
            ) : (
              <span className="text-[13px] text-muted-foreground">Aba</span>
            )}
          </div>
        ) : (
          <SheetOptionPicker
            value={task.aba ?? ""}
            options={abaPickOptions()}
            placeholder="Aba"
            searchPlaceholder="Pesquisar aba…"
            emptyText="Nenhuma aba encontrada."
            label={`Aba da tarefa ${index}`}
            allowEmpty={selected && !!task.aba}
            emptyLabel="Sem aba"
            onChange={(aba) => {
              if (aba === "") {
                persist({ aba: null });
                return;
              }
              if (!isTaskSheetAba(aba)) return;
              persist({ aba });
            }}
          />
        )}
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!selected}
          value={task.repete ?? ""}
          options={repetePickOptions()}
          placeholder="Não repete"
          searchPlaceholder="Pesquisar período…"
          emptyText="Nenhum período encontrado."
          label={`Repetição da tarefa ${index}`}
          allowEmpty
          emptyLabel="Não repete"
          onChange={(repete) => {
            const dia = parseRepeteDay(repete);
            persist({
              repete: repete || null,
              ...(!task.entrega && dia != null
                ? { entrega: upcomingWeeklyEntrega(today, dia) }
                : {}),
            });
          }}
        />
      </td>
    </tr>
  );
}

function clientPickOptions(clients: TaskSheetClient[]): SheetPickOption[] {
  return clients.map((client) => ({
    value: String(client.id),
    label: client.nome,
    group: "Clientes",
  }));
}

function userPickOptions(
  users: TaskSheetUser[],
  selectedId: string | null,
  selectedNome: string | null,
): SheetPickOption[] {
  const options = users.map((user) => ({
    value: user.id,
    label: user.nome,
    hint: user.email || undefined,
    group: user.tipo === "admin" ? "Admins" : "Clientes",
  }));
  if (selectedId && !options.some((option) => option.value === selectedId)) {
    options.unshift({
      value: selectedId,
      label: selectedNome || "Usuário",
      group: "Admins",
    });
  }
  return options;
}

function parseRepeteDay(value: string): number | null {
  const match = /^semanal:([0-6])$/.exec(value);
  return match ? Number(match[1]) : null;
}

function repetePickOptions(): SheetPickOption[] {
  return WEEKDAY_LABELS.map((label, dia) => ({
    value: `semanal:${dia}`,
    label: `Toda ${label}`,
    group: "Período",
  }));
}

function abaPickOptions(): SheetPickOption[] {
  return TASK_SHEET_ABAS.map((aba) => ({
    value: aba.value,
    label: aba.label,
    group: "Abas",
  }));
}

function statusPickOptions(): SheetPickOption[] {
  return TASK_SHEET_STATUSES.map((status) => ({
    value: status.value,
    label: status.label,
    group: "Status",
  }));
}

function statusTone(status: TaskSheetStatus) {
  if (status === "completed") return "text-primary";
  if (status === "cancelled") return "text-muted-foreground";
  return undefined;
}

export function TaskDescriptionDialog({
  task,
  saving,
  onOpenChange,
  onSave,
  readOnly = false,
}: {
  task: TaskSheetTask | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (titulo: string, descricao: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [seenId, setSeenId] = useState<string | null>(task?.id ?? null);
  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [html, setHtml] = useState(task?.descricao ?? "");

  if (!task && seenId) setSeenId(null);
  if (task && task.id !== seenId) {
    setSeenId(task.id);
    setTitulo(task.titulo);
    setHtml(task.descricao ?? "");
  }

  const status = TASK_SHEET_STATUSES.find((item) => item.value === task?.status)?.label;

  return (
    <Dialog open={task != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {task ? (
          <>
            <DialogHeader className="pr-8">
              <DialogTitle>Descrição</DialogTitle>
              <DialogDescription>
                {task.cliente_nome}
                {task.entrega ? ` · entrega ${formatEntrega(task.entrega)}` : ""}
                {status ? ` · ${status}` : ""}
              </DialogDescription>
            </DialogHeader>
            {readOnly ? (
              <p className="text-base font-medium text-foreground">{task.titulo}</p>
            ) : (
              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-foreground">Tarefa</span>
                <Input
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  aria-label="Nome da tarefa"
                />
              </label>
            )}
            <RoteiroHtmlEditor
              resetKey={task.id}
              html={task.descricao}
              editable={!readOnly}
              onChange={readOnly ? undefined : setHtml}
              minHeightClass="min-h-[320px]"
              className="border-muted"
            />
            {readOnly ? null : (
              <DialogFooter>
                <Button
                  type="button"
                  disabled={saving || !titulo.trim()}
                  onClick={() => {
                    void onSave(titulo.trim(), html).catch(() => {
                      // O toast fica no onError da mutation.
                    });
                  }}
                >
                  {saving ? "Salvando…" : "Salvar descrição"}
                </Button>
              </DialogFooter>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const abaLinkClass =
  "inline-flex h-7 max-w-full items-center truncate rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90";

export function TaskAbaLink({
  aba,
  side,
  clienteNome,
}: {
  aba: TaskSheetAba;
  side: "admin" | "cliente";
  clienteNome: string;
}) {
  const label = taskAbaAction(aba);
  if (side === "admin") {
    if (aba === "conteudos")
      return (
        <Link to="/admin/aprovacoes" className={abaLinkClass}>
          {label}
        </Link>
      );
    if (aba === "crm")
      return (
        <Link to="/admin/crm" className={abaLinkClass}>
          {label}
        </Link>
      );
    if (aba === "relatorio")
      return (
        <Link to="/admin/relatorios" className={abaLinkClass}>
          {label}
        </Link>
      );
    if (aba === "diretrizes")
      return (
        <Link to="/admin/brandbook" className={abaLinkClass}>
          {label}
        </Link>
      );
    return (
      <Link to="/admin/conexoes" className={abaLinkClass}>
        {label}
      </Link>
    );
  }

  const slug = slugify(clienteNome);
  if (!slug) return <span className="text-xs text-muted-foreground">{label}</span>;
  if (aba === "conteudos")
    return (
      <Link to="/cliente/$cliente/aprovacoes" params={{ cliente: slug }} className={abaLinkClass}>
        {label}
      </Link>
    );
  if (aba === "crm")
    return (
      <Link to="/cliente/$cliente/crm" params={{ cliente: slug }} className={abaLinkClass}>
        {label}
      </Link>
    );
  if (aba === "relatorio")
    return (
      <Link to="/cliente/$cliente/relatorio" params={{ cliente: slug }} className={abaLinkClass}>
        {label}
      </Link>
    );
  if (aba === "diretrizes")
    return (
      <Link to="/cliente/$cliente/brandbook" params={{ cliente: slug }} className={abaLinkClass}>
        {label}
      </Link>
    );
  return (
    <Link to="/cliente/$cliente/conexoes" params={{ cliente: slug }} className={abaLinkClass}>
      {label}
    </Link>
  );
}

function EntregaInput({
  iso,
  label,
  late = false,
  locked = false,
  onCommit,
}: {
  iso: string;
  label: string;
  late?: boolean;
  locked?: boolean;
  onCommit: (iso: string) => void;
}) {
  const [text, setText] = useState(() => isoToBrDate(iso));
  const [source, setSource] = useState(iso);
  if (iso !== source) {
    setSource(iso);
    setText(isoToBrDate(iso));
  }

  if (locked) {
    return (
      <span className={cn("flex h-9 items-center px-2 text-[13px]", late && "text-destructive")}>
        {isoToBrDate(iso) || "—"}
      </span>
    );
  }

  function commit(nextText: string) {
    if (!nextText.trim()) {
      setText("");
      if (iso) onCommit("");
      return;
    }
    const parsed = brDateToIso(nextText);
    if (!parsed) {
      toast.error("Use dia/mês/ano. Exemplo: 02/10/2026.");
      setText(isoToBrDate(iso));
      return;
    }
    setText(isoToBrDate(parsed));
    if (parsed !== iso) onCommit(parsed);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd/mm/aaaa"
      value={text}
      aria-label={label}
      data-sheet-cell=""
      className={cn(fieldClass, late && "text-destructive")}
      onChange={(event) => {
        const masked = maskBrDate(event.target.value);
        setText(masked);
        const parsed = brDateToIso(masked);
        if (parsed && parsed !== iso) onCommit(parsed);
      }}
      onBlur={() => commit(text)}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        commit(event.currentTarget.value);
        focusAdjacentSheetCell(event.currentTarget, 1);
      }}
    />
  );
}

function formatEntrega(entrega: string) {
  return isoToBrDate(entrega) || entrega;
}
