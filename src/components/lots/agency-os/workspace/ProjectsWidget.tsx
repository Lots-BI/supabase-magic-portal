import { Suspense, useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MiniDashboardCard, priorityTypeIcon } from "../MiniDashboardCard";
import { WorkspaceWidgetShell, WidgetSkeleton } from "./WorkspaceWidgetShell";
import { CreateProjectDialog } from "../CreateProjectDialog";
import { getClientProjects, createAgencyProject } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import { checklistProgress } from "@/modules/agency-os/services/group-timeline-events";
import { isOverdue } from "@/modules/agency-os/lib/format-time";
import { PRIORITY_TYPE_META } from "@/modules/agency-os/priority-engine/config/type-meta";

const projectsQuery = (clientId: number) =>
  queryOptions({
    queryKey: agencyOsKeys.clientProjects(clientId),
    queryFn: () => getClientProjects({ data: { id: clientId } }),
  });

export function ProjectsWidget({
  clientId,
  context,
}: {
  clientId?: number;
  context?: Record<string, unknown>;
}) {
  if (!clientId) return null;
  const clientNome =
    typeof context?.clientNome === "string" ? context.clientNome : `Cliente #${clientId}`;
  const clientEmpresa = typeof context?.clientEmpresa === "string" ? context.clientEmpresa : null;

  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Projetos" description="Entregas em andamento">
          <WidgetSkeleton />
        </WorkspaceWidgetShell>
      }
    >
      <ProjectsWidgetContent
        clientId={clientId}
        clientNome={clientNome}
        clientEmpresa={clientEmpresa}
      />
    </Suspense>
  );
}

function ProjectsWidgetContent({
  clientId,
  clientNome,
  clientEmpresa,
}: {
  clientId: number;
  clientNome: string;
  clientEmpresa: string | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: projects } = useSuspenseQuery(projectsQuery(clientId));
  const active = projects.filter((p) => p.status_kanban !== "finalizado");

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createAgencyProject>[0]["data"]) =>
      createAgencyProject({ data: input }),
    onSuccess: async () => {
      toast.success("Projeto criado");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: agencyOsKeys.clientProjects(clientId) });
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const clientOption = [{ id: clientId, nome_cliente: clientNome, empresa: clientEmpresa }];

  return (
    <>
      <WorkspaceWidgetShell
        title="Projetos"
        description={`${active.length} em andamento`}
        actions={
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
            Novo
          </Button>
        }
      >
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum projeto ativo.{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setOpen(true)}
            >
              Criar projeto
            </button>
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((project) => (
              <li key={project.id}>
                <MiniDashboardCard
                  compact
                  icon={priorityTypeIcon("project")}
                  typeLabel={`${PRIORITY_TYPE_META.project.label} · ${project.tipo}`}
                  titulo={project.titulo}
                  descricao={project.etiqueta}
                  prazo={project.prazo}
                  prioridade={project.prioridade}
                  progress={checklistProgress(project.checklist)}
                  updatedAt={project.updated_at}
                  overdue={isOverdue(project.prazo)}
                />
              </li>
            ))}
          </ul>
        )}
      </WorkspaceWidgetShell>

      <CreateProjectDialog
        open={open}
        onOpenChange={setOpen}
        clients={clientOption}
        defaultClienteId={clientId}
        isPending={createMutation.isPending}
        onSubmit={(input) => createMutation.mutate(input)}
      />
    </>
  );
}
