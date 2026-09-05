import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { GenericKanbanBoard } from "@/components/lots/kanban/GenericKanbanBoard";
import {
  MiniDashboardCard,
  priorityTypeIcon,
} from "@/components/lots/agency-os/MiniDashboardCard";
import { getProductionKanban, moveAgencyProject } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import type { AgencyProject, AgencyProjectStatus } from "@/modules/agency-os/types/operations";
import { PRIORITY_TYPE_META } from "@/modules/agency-os/priority-engine/config/type-meta";
import { checklistProgress } from "@/modules/agency-os/services/group-timeline-events";
import { isOverdue } from "@/modules/agency-os/lib/format-time";

const kanbanQuery = queryOptions({
  queryKey: agencyOsKeys.kanban(),
  queryFn: () => getProductionKanban(),
});

export function ProductionKanbanSection({
  onCreateProject,
}: { onCreateProject?: () => void } = {}) {
  const qc = useQueryClient();
  const { data: board } = useSuspenseQuery(kanbanQuery);
  const totalItems = board.columns.reduce((n, c) => n + c.items.length, 0);

  const moveMutation = useMutation({
    mutationFn: (input: { id: string; status_kanban: AgencyProjectStatus; kanban_ordem: number }) =>
      moveAgencyProject({ data: input }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: agencyOsKeys.kanban() });
      const prev = qc.getQueryData(kanbanQuery.queryKey);
      qc.setQueryData(kanbanQuery.queryKey, (old: typeof board | undefined) => {
        if (!old) return old;
        const item = old.columns.flatMap((c) => c.items).find((i) => i.id === input.id);
        if (!item) return old;
        return {
          columns: old.columns.map((col) => {
            if (col.id === input.status_kanban) {
              return {
                ...col,
                items: [
                  ...col.items.filter((i) => i.id !== input.id),
                  { ...item, status_kanban: input.status_kanban },
                ],
              };
            }
            return { ...col, items: col.items.filter((i) => i.id !== input.id) };
          }),
        };
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(kanbanQuery.queryKey, ctx.prev);
      toast.error(e instanceof Error ? e.message : "Falha ao mover");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
  });

  return (
    <>
      {totalItems === 0 && (
        <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum projeto em produção ainda.</p>
          {onCreateProject && (
            <button
              type="button"
              className="lots-focus mt-2 text-sm font-medium text-primary hover:underline"
              onClick={onCreateProject}
            >
              Criar primeiro projeto
            </button>
          )}
        </div>
      )}
      <GenericKanbanBoard
        columns={board.columns}
        onMove={(item, _from, toColumnId) => {
          const targetCol = board.columns.find((c) => c.id === toColumnId);
          moveMutation.mutate({
            id: item.id,
            status_kanban: toColumnId as AgencyProjectStatus,
            kanban_ordem: targetCol?.items.length ?? 0,
          });
        }}
        renderCard={(project: AgencyProject, { isDragging }) => (
          <ProjectKanbanCard project={project} isDragging={isDragging} />
        )}
      />
    </>
  );
}

function ProjectKanbanCard({
  project,
  isDragging,
}: {
  project: AgencyProject;
  isDragging: boolean;
}) {
  const progress = checklistProgress(project.checklist);
  const meta = PRIORITY_TYPE_META.project;

  return (
    <MiniDashboardCard
      compact
      isDragging={isDragging}
      icon={priorityTypeIcon("project")}
      typeLabel={`${meta.label} · ${project.tipo}`}
      clienteNome={project.cliente_nome}
      titulo={project.titulo}
      descricao={project.etiqueta}
      prazo={project.prazo}
      prioridade={project.prioridade}
      healthTier={project.cliente_health_tier}
      progress={progress}
      updatedAt={project.updated_at}
      overdue={isOverdue(project.prazo)}
    />
  );
}

export { kanbanQuery as productionKanbanQuery };
