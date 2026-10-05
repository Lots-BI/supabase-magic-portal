import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SheetOptionPicker, type SheetPickOption } from "@/components/lots/admin/SheetOptionPicker";
import { TaskColumnFilter } from "@/components/lots/admin/TaskColumnFilter";
import { ColumnResizeHandle } from "@/components/lots/admin/ColumnResizeHandle";
import { useSheetColumnWidths } from "@/components/lots/admin/sheet-column-resize";
import {
  applyTaskSheetView,
  filterIsActive,
  type ColumnFilter,
  type SheetSort,
  type TaskColumnId,
} from "@/components/lots/admin/task-sheet-view";
import { taskSheetQuery } from "@/components/lots/admin/task-sheet-query";
import {
  listLotsBoard,
  restoreLotsPendencia,
  updateLotsPendencia,
  type LotsPendenciaRow,
} from "@/modules/agency-os/lots-pendencias.server";
import { saveTaskSheet } from "@/modules/agency-os/tasks-sheet.server";
import { syncInstagramProfileFn } from "@/modules/instagram-posts/instagram-posts.server";
import {
  brDateToIso,
  isoToBrDate,
  isEntregaAtrasada,
  isTaskSheetAba,
  maskBrDate,
  TASK_SHEET_ABAS,
  TASK_SHEET_STATUSES,
  taskAbaAction,
  taskAbaHref,
  todayInSaoPaulo,
  type TaskSheetAba,
  type TaskSheetClient,
  type TaskSheetStatus,
  type TaskSheetTask,
  type TaskSheetUser,
  upcomingWeeklyEntrega,
  WEEKDAY_LABELS,
} from "@/modules/agency-os/tasks-sheet";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-9 w-full min-w-0 bg-transparent px-2 text-[13px] leading-9 text-foreground outline-none placeholder:text-muted-foreground focus-visible:relative focus-visible:z-10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

type PendenciaPatch = {
  titulo?: string;
  cadastro_cliente_id?: number;
  responsavel_user_id?: string | null;
  entrega?: string | null;
  aba?: TaskSheetAba;
  repete?: string | null;
  status?: TaskSheetStatus;
};

const linkClass =
  "inline-flex h-7 max-w-full items-center truncate rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90";

const restoreClass =
  "inline-flex h-7 items-center rounded-md border border-muted bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50";

function Acao({
  href,
  aba,
  sincronizar = false,
  cadastroClienteId = null,
}: {
  href: string;
  aba: string;
  sincronizar?: boolean;
  cadastroClienteId?: number | null;
}) {
  const syncFn = useServerFn(syncInstagramProfileFn);
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: () => syncFn({ data: { cadastroClienteId: cadastroClienteId ?? 0 } }),
    onSuccess: (result) => {
      if (result && "ok" in result && result.ok === false) {
        toast.error("error" in result ? String(result.error) : "Não foi possível sincronizar.");
        return;
      }
      toast.success("Instagram sincronizado.");
      void queryClient.invalidateQueries({ queryKey: ["lots-pendencias"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (sincronizar && cadastroClienteId) {
    return (
      <button
        type="button"
        className={linkClass}
        disabled={sync.isPending}
        onClick={() => sync.mutate()}
      >
        {sync.isPending ? "Puxando…" : "Puxar métricas"}
      </button>
    );
  }
  const label = href.startsWith("/admin/solicitacoes")
    ? "Ver pedidos"
    : href.includes("/instagram")
      ? "Abrir Instagram"
      : taskAbaAction(aba as TaskSheetAba);
  return (
    <a href={href} className={linkClass}>
      {label}
    </a>
  );
}

function quando(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return isoToBrDate(iso) || iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LotsPendenciasBoard({
  entregues,
  clients = [],
  users = [],
  editable = false,
}: {
  entregues: TaskSheetTask[];
  clients?: TaskSheetClient[];
  users?: TaskSheetUser[];
  editable?: boolean;
}) {
  const queryClient = useQueryClient();
  const [restoring, setRestoring] = useState<string | null>(null);
  const board = useQuery({
    queryKey: ["lots-pendencias"],
    queryFn: () => listLotsBoard(),
    refetchOnWindowFocus: true,
  });
  const [filaCliente, setFilaCliente] = useState("");
  const logColumns = useSheetColumnWidths("lots-sheet-log", [280, 180, 140, 160, 120]);
  const abertas = (board.data?.abertas ?? []).filter((row) => editable || row.lado === "cliente");
  const logAuto = (board.data?.log ?? []).filter((row) => editable || row.lado === "cliente");
  const clientesIds = new Set(
    users.filter((user) => user.tipo === "cliente").map((user) => user.id),
  );
  function tarefaDoCliente(row: LotsPendenciaRow) {
    return row.lado === "cliente" || clientesIds.has(row.responsavelUserId ?? "");
  }
  const fila = !editable
    ? abertas
    : filaCliente
      ? abertas.filter((row) => String(row.cadastroClienteId ?? "") === filaCliente)
      : abertas.filter((row) => !tarefaDoCliente(row));

  async function devolverManual(task: TaskSheetTask) {
    const key = `manual-${task.id}`;
    setRestoring(key);
    queryClient.setQueryData<{
      clients: TaskSheetClient[];
      tasks: TaskSheetTask[];
      users: TaskSheetUser[];
    }>(taskSheetQuery.queryKey, (current) => {
      if (!current) return current;
      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? { ...item, status: "open", concluida_em: null } : item,
        ),
      };
    });
    try {
      await saveTaskSheet({
        data: {
          id: task.id,
          titulo: task.titulo,
          cadastro_cliente_id: task.cadastro_cliente_id,
          entrega: task.entrega || null,
          status: "open",
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível devolver.");
      void queryClient.invalidateQueries({ queryKey: taskSheetQuery.queryKey });
    } finally {
      setRestoring(null);
    }
  }

  async function devolverPendencia(row: LotsPendenciaRow) {
    if (!row.logId) return;
    const key = `auto-${row.logId}`;
    setRestoring(key);
    queryClient.setQueryData<{ abertas: LotsPendenciaRow[]; log: LotsPendenciaRow[] }>(
      ["lots-pendencias"],
      (current) => {
        if (!current) return current;
        const jaAberta = current.abertas.some((item) => item.chave === row.chave);
        return {
          abertas: jaAberta
            ? current.abertas
            : [{ ...row, concluidaEm: null, logId: null }, ...current.abertas],
          log: current.log.filter((item) => item.logId !== row.logId),
        };
      },
    );
    try {
      await restoreLotsPendencia({ data: { logId: row.logId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível devolver.");
      void queryClient.invalidateQueries({ queryKey: ["lots-pendencias"] });
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3" aria-label="Tarefas Lots BI">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Tarefas Lots BI
          </h2>
          <p className="text-sm text-muted-foreground">pendências dentro da plataforma.</p>
        </div>
        {editable ? (
          <div className="max-w-xs">
            <SheetOptionPicker
              value={filaCliente}
              options={clients.map((client) => ({
                value: String(client.id),
                label: client.nome,
                group: "Clientes",
              }))}
              placeholder="Tarefas da operação"
              searchPlaceholder="Pesquisar cliente…"
              emptyText="Nenhum cliente encontrado."
              label="Fila de produção"
              allowEmpty
              emptyLabel="Tarefas da operação"
              onChange={setFilaCliente}
            />
          </div>
        ) : null}
        {board.isLoading ? (
          <p className="text-sm text-muted-foreground">Atualizando pendências…</p>
        ) : board.error ? (
          <p className="text-sm text-destructive">
            {board.error instanceof Error ? board.error.message : "Não foi possível atualizar."}
          </p>
        ) : (
          <PendenciaTable rows={fila} clients={clients} users={users} editable={editable} />
        )}
      </section>
      <section className="space-y-3" aria-label="Log de tarefas">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Log de tarefas
          </h2>
          <p className="text-sm text-muted-foreground">O que já foi executado.</p>
        </div>
        <div className="lots-surface overflow-hidden border border-muted">
          <div className="lots-table-scroll">
            <table
              className="table-fixed border-collapse text-[13px]"
              style={{
                width: logColumns.widths
                  .slice(0, editable ? 5 : 4)
                  .reduce((sum, width) => sum + width, 0),
              }}
            >
              <colgroup>
                {logColumns.widths.slice(0, editable ? 5 : 4).map((width, index) => (
                  <col key={index} style={{ width }} />
                ))}
              </colgroup>
              <thead className="bg-muted">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {["Tarefa", "Cliente", "Origem", "Concluída", "Devolver"]
                    .slice(0, editable ? 5 : 4)
                    .map((label, index) => (
                      <th key={label} className="relative border border-muted px-2 py-2">
                        {label === "Devolver" ? "" : label}
                        <ColumnResizeHandle
                          label={label}
                          onPointerDown={(event) => logColumns.startResize(index, event)}
                        />
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {entregues.map((task) => (
                  <tr key={`manual-${task.id}`} className="bg-card">
                    <td className="border border-muted px-2 py-2">{task.titulo}</td>
                    <td className="border border-muted px-2 py-2 text-muted-foreground">
                      {task.cliente_nome}
                    </td>
                    <td className="border border-muted px-2 py-2 text-muted-foreground">Manual</td>
                    <td className="border border-muted px-2 py-2 text-muted-foreground">
                      {quando(task.concluida_em)}
                    </td>
                    {editable ? (
                      <td className="border border-muted px-2 py-2">
                        <button
                          type="button"
                          className={restoreClass}
                          disabled={restoring === `manual-${task.id}`}
                          onClick={() => void devolverManual(task)}
                        >
                          Devolver
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {logAuto.map((row) => (
                  <tr key={`auto-${row.logId ?? row.chave}-${row.concluidaEm}`} className="bg-card">
                    <td className="border border-muted px-2 py-2">{row.titulo}</td>
                    <td className="border border-muted px-2 py-2 text-muted-foreground">
                      {row.clienteNome}
                    </td>
                    <td className="border border-muted px-2 py-2 text-muted-foreground">Lots BI</td>
                    <td className="border border-muted px-2 py-2 text-muted-foreground">
                      {quando(row.concluidaEm)}
                    </td>
                    {editable ? (
                      <td className="border border-muted px-2 py-2">
                        <button
                          type="button"
                          className={restoreClass}
                          disabled={!row.logId || restoring === `auto-${row.logId}`}
                          onClick={() => void devolverPendencia(row)}
                        >
                          Devolver
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {entregues.length === 0 && logAuto.length === 0 ? (
                  <tr>
                    <td
                      colSpan={editable ? 5 : 4}
                      className="border border-muted px-3 py-6 text-center text-muted-foreground"
                    >
                      Nenhuma tarefa executada ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function asSheetTask(row: LotsPendenciaRow): TaskSheetTask {
  return {
    id: row.chave,
    titulo: row.titulo,
    cadastro_cliente_id: row.cadastroClienteId,
    cliente_nome: row.clienteNome,
    entrega: row.entrega,
    status: "open",
    descricao: null,
    responsavel_user_id: row.responsavelUserId,
    responsavel_nome: row.responsavelNome,
    aba: isTaskSheetAba(row.aba) ? row.aba : null,
    repete: row.repete,
    concluida_em: null,
  };
}

function PendenciaTable({
  rows,
  clients,
  users,
  editable,
}: {
  rows: LotsPendenciaRow[];
  clients: TaskSheetClient[];
  users: TaskSheetUser[];
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const columns = useSheetColumnWidths(
    "lots-sheet-pendencias",
    [40, 280, 176, 176, 144, 128, 160, 192],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<SheetSort>(null);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<TaskColumnId, ColumnFilter>>>(
    {},
  );
  const sheetRows = rows.map(asSheetTask);
  const byKey = new Map(rows.map((row) => [row.chave, row]));
  const visible = applyTaskSheetView(sheetRows, sort, columnFilters).flatMap((task) => {
    const row = byKey.get(task.id);
    return row ? [row] : [];
  });
  const filtersActive = (Object.keys(columnFilters) as TaskColumnId[]).some((column) =>
    filterIsActive(columnFilters[column]),
  );

  async function save(chave: string, patch: PendenciaPatch) {
    const fechou = patch.status === "completed" || patch.status === "cancelled";
    queryClient.setQueryData<{ abertas: LotsPendenciaRow[]; log: LotsPendenciaRow[] }>(
      ["lots-pendencias"],
      (current) => {
        if (!current) return current;
        const row = current.abertas.find((item) => item.chave === chave);
        if (!row) return current;
        if (fechou) {
          return {
            abertas: current.abertas.filter((item) => item.chave !== chave),
            log: [{ ...row, concluidaEm: new Date().toISOString() }, ...current.log],
          };
        }
        return {
          ...current,
          abertas: current.abertas.map((item) =>
            item.chave === chave
              ? {
                  ...item,
                  titulo: patch.titulo ?? item.titulo,
                  cadastroClienteId: patch.cadastro_cliente_id ?? item.cadastroClienteId,
                  clienteNome:
                    clients.find((client) => client.id === patch.cadastro_cliente_id)?.nome ??
                    item.clienteNome,
                  responsavelUserId:
                    patch.responsavel_user_id === undefined
                      ? item.responsavelUserId
                      : patch.responsavel_user_id,
                  responsavelNome:
                    patch.responsavel_user_id === undefined
                      ? item.responsavelNome
                      : (users.find((user) => user.id === patch.responsavel_user_id)?.nome ?? null),
                  entrega: patch.entrega === undefined ? item.entrega : (patch.entrega ?? ""),
                  aba: patch.aba ?? item.aba,
                  href:
                    (patch.aba && patch.aba !== item.aba) ||
                    (patch.cadastro_cliente_id &&
                      patch.cadastro_cliente_id !== item.cadastroClienteId)
                      ? (taskAbaHref(
                          isTaskSheetAba(patch.aba ?? item.aba)
                            ? (patch.aba ?? item.aba)
                            : "conteudos",
                          item.lado,
                          clients.find((client) => client.id === patch.cadastro_cliente_id)?.nome ??
                            item.clienteNome,
                        ) ?? item.href)
                      : item.href,
                  repete: patch.repete === undefined ? item.repete : patch.repete,
                }
              : item,
          ),
        };
      },
    );
    try {
      const result = await updateLotsPendencia({ data: { chave, ...patch } });
      if (result.closed && result.logId) {
        queryClient.setQueryData<{ abertas: LotsPendenciaRow[]; log: LotsPendenciaRow[] }>(
          ["lots-pendencias"],
          (current) => {
            if (!current) return current;
            let stamped = false;
            return {
              ...current,
              log: current.log.map((item) => {
                if (!stamped && item.chave === chave && !item.logId) {
                  stamped = true;
                  return { ...item, logId: result.logId };
                }
                return item;
              }),
            };
          },
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      void queryClient.invalidateQueries({ queryKey: ["lots-pendencias"] });
    }
  }

  return (
    <div className="lots-surface overflow-hidden border border-muted">
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
                {editable ? (
                  <input
                    type="checkbox"
                    aria-label="Selecionar pendências visíveis"
                    checked={
                      visible.length > 0 && visible.every((row) => selected.includes(row.chave))
                    }
                    onChange={(event) => {
                      const ids = visible.map((row) => row.chave);
                      setSelected((current) =>
                        event.target.checked
                          ? [...new Set([...current, ...ids])]
                          : current.filter((id) => !ids.includes(id)),
                      );
                    }}
                  />
                ) : null}
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
                      tasks={sheetRows}
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
            {visible.map((row) => (
              <PendenciaRow
                key={row.chave}
                row={row}
                selected={selected.includes(row.chave)}
                editable={editable}
                clients={clients}
                users={users}
                onSelectedChange={(checked) =>
                  setSelected((current) =>
                    checked ? [...current, row.chave] : current.filter((id) => id !== row.chave),
                  )
                }
                onSave={(patch) => void save(row.chave, patch)}
              />
            ))}
            {filtersActive && visible.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="border border-muted px-3 py-6 text-center text-muted-foreground"
                >
                  Nenhuma pendência com esse filtro.
                </td>
              </tr>
            ) : null}
            {!filtersActive && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="border border-muted px-3 py-6 text-center text-muted-foreground"
                >
                  Nenhuma pendência aberta na plataforma.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PendenciaRow({
  row,
  selected,
  editable,
  clients,
  users,
  onSelectedChange,
  onSave,
}: {
  row: LotsPendenciaRow;
  selected: boolean;
  editable: boolean;
  clients: TaskSheetClient[];
  users: TaskSheetUser[];
  onSelectedChange: (checked: boolean) => void;
  onSave: (patch: PendenciaPatch) => void;
}) {
  const editing = editable && selected;
  const today = todayInSaoPaulo();
  const late = isEntregaAtrasada(row.entrega, "open", today);
  const aba = isTaskSheetAba(row.aba) ? row.aba : null;

  return (
    <tr className={cn("bg-card", editing && "bg-primary/5")}>
      <td className="border border-muted bg-muted/40 text-center">
        {editable ? (
          <input
            type="checkbox"
            aria-label={`Selecionar ${row.titulo}`}
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
          />
        ) : null}
      </td>
      <td className="border border-muted p-0">
        {editing ? (
          <TitleInput titulo={row.titulo} onCommit={(titulo) => onSave({ titulo })} />
        ) : (
          <span className="flex h-9 items-center truncate px-2 text-[13px]">{row.titulo}</span>
        )}
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!editing}
          value={String(row.cadastroClienteId)}
          options={clientPickOptions(clients, row)}
          placeholder={row.clienteNome || "Cliente"}
          searchPlaceholder="Pesquisar cliente…"
          emptyText="Nenhum cliente encontrado."
          label={`Cliente de ${row.titulo}`}
          onChange={(next) => {
            if (!next) return;
            onSave({ cadastro_cliente_id: Number(next) });
          }}
        />
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!editing}
          value={row.responsavelUserId ?? ""}
          options={userPickOptions(users, row.responsavelUserId, row.responsavelNome)}
          placeholder={row.responsavelNome || "Proprietário"}
          searchPlaceholder="Pesquisar usuário…"
          emptyText="Nenhum usuário encontrado."
          label={`Proprietário de ${row.titulo}`}
          allowEmpty
          emptyLabel="Sem proprietário"
          onChange={(next) => onSave({ responsavel_user_id: next || null })}
        />
      </td>
      <td className="border border-muted p-0">
        <EntregaCell
          locked={!editing}
          iso={row.entrega}
          late={late}
          label={`Entrega de ${row.titulo}`}
          onCommit={(entrega) => onSave({ entrega: entrega || null })}
        />
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!editing}
          value="open"
          options={statusPickOptions()}
          placeholder="Aberta"
          searchPlaceholder="Pesquisar status…"
          emptyText="Nenhum status encontrado."
          label={`Status de ${row.titulo}`}
          onChange={(status) => {
            if (status !== "completed" && status !== "cancelled") return;
            onSave({ status });
          }}
        />
      </td>
      <td className="overflow-hidden border border-muted p-0">
        {editing && aba ? (
          <SheetOptionPicker
            value={aba}
            options={abaPickOptions()}
            placeholder="Aba"
            searchPlaceholder="Pesquisar aba…"
            emptyText="Nenhuma aba encontrada."
            label={`Aba de ${row.titulo}`}
            onChange={(next) => {
              if (!isTaskSheetAba(next) || next === aba) return;
              onSave({ aba: next });
            }}
          />
        ) : (
          <div className="flex h-9 items-center px-2">
            <Acao
              href={row.href}
              aba={row.aba}
              cadastroClienteId={row.cadastroClienteId}
              sincronizar={row.chave.includes(":puxar-instagram")}
            />
          </div>
        )}
      </td>
      <td className="overflow-hidden border border-muted p-0">
        <SheetOptionPicker
          locked={!editing}
          value={row.repete ?? ""}
          options={repetePickOptions()}
          placeholder="Não repete"
          searchPlaceholder="Pesquisar período…"
          emptyText="Nenhum período encontrado."
          label={`Repetição de ${row.titulo}`}
          allowEmpty
          emptyLabel="Não repete"
          onChange={(repete) => {
            const dia = parseRepeteDay(repete);
            onSave({
              repete: repete || null,
              ...(!row.entrega && dia != null
                ? { entrega: upcomingWeeklyEntrega(today, dia) }
                : {}),
            });
          }}
        />
      </td>
    </tr>
  );
}

function TitleInput({ titulo, onCommit }: { titulo: string; onCommit: (titulo: string) => void }) {
  const [text, setText] = useState(titulo);
  const [source, setSource] = useState(titulo);
  if (titulo !== source) {
    setSource(titulo);
    setText(titulo);
  }

  function commit(next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === titulo) {
      setText(titulo);
      return;
    }
    setText(trimmed);
    onCommit(trimmed);
  }

  return (
    <input
      type="text"
      value={text}
      aria-label="Tarefa"
      data-sheet-cell=""
      className={fieldClass}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => commit(text)}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        commit(event.currentTarget.value);
      }}
    />
  );
}

function EntregaCell({
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
      }}
    />
  );
}

function clientPickOptions(clients: TaskSheetClient[], row: LotsPendenciaRow): SheetPickOption[] {
  const options = clients.map((client) => ({
    value: String(client.id),
    label: client.nome,
    group: "Clientes",
  }));
  if (!options.some((option) => option.value === String(row.cadastroClienteId))) {
    options.unshift({
      value: String(row.cadastroClienteId),
      label: row.clienteNome,
      group: "Clientes",
    });
  }
  return options;
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
      hint: undefined,
      group: "Admins",
    });
  }
  return options;
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

function parseRepeteDay(value: string): number | null {
  const match = /^semanal:([0-6])$/.exec(value);
  return match ? Number(match[1]) : null;
}

export function LotsPendenciasClient() {
  return <LotsPendenciasBoard entregues={[]} />;
}
