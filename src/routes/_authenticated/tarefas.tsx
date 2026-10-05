import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LotsPendenciasBoard } from "@/components/lots/admin/LotsPendenciasBoard";
import { TaskAbaLink } from "@/components/lots/admin/TaskSheet";
import { PageHeader } from "@/components/lots/PageHeader";
import { brandTitle } from "@/lib/brand";
import { listClientTasks } from "@/modules/agency-os/tasks-sheet.server";
import { isoToBrDate, TASK_SHEET_STATUSES } from "@/modules/agency-os/tasks-sheet";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: brandTitle("Tarefas") }] }),
  component: ClienteTarefasPage,
});

function ClienteTarefasPage() {
  const tasks = useQuery({
    queryKey: ["cliente", "tarefas"],
    queryFn: () => listClientTasks(),
  });

  const rows = (tasks.data ?? []).filter((task) => task.status !== "completed");
  const entregues = (tasks.data ?? []).filter((task) => task.status === "completed");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Entrega"
        title="Tarefas"
        description="O que está na sua conta. O botão abre a aba onde a tarefa deve ser feita."
      />
      {tasks.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando tarefas…</p>
      ) : tasks.error ? (
        <p className="text-sm text-destructive">
          {tasks.error instanceof Error ? tasks.error.message : "Não foi possível carregar."}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma tarefa para a sua conta.</p>
      ) : (
        <div className="lots-surface overflow-hidden border border-muted">
          <div className="lots-table-scroll">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead className="bg-muted">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="border border-muted px-3 py-2">Tarefa</th>
                  <th className="border border-muted px-3 py-2">Cliente</th>
                  <th className="border border-muted px-3 py-2">Entrega</th>
                  <th className="border border-muted px-3 py-2">Status</th>
                  <th className="border border-muted px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => {
                  const status = TASK_SHEET_STATUSES.find((item) => item.value === task.status);
                  return (
                    <tr key={task.id} className="bg-card">
                      <td className="border border-muted px-3 py-2 font-medium text-foreground">
                        {task.titulo}
                      </td>
                      <td className="border border-muted px-3 py-2 text-muted-foreground">
                        {task.cliente_nome}
                      </td>
                      <td className="border border-muted px-3 py-2 text-muted-foreground">
                        {task.entrega ? isoToBrDate(task.entrega) : "—"}
                      </td>
                      <td className="border border-muted px-3 py-2">{status?.label ?? "—"}</td>
                      <td className="border border-muted px-3 py-2">
                        {task.aba ? (
                          <TaskAbaLink
                            aba={task.aba}
                            side="cliente"
                            clienteNome={task.cliente_nome}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <LotsPendenciasBoard entregues={entregues} />
    </div>
  );
}
