import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { DollarSign, Users, FolderKanban, Target, Radio, Plus, ListTodo } from "lucide-react";
import { adminTitle, BRAND_NAME } from "@/lib/brand";
import { PageHeader } from "@/components/lots/PageHeader";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { SectionCard } from "@/components/lots/SectionCard";
import { SmartBriefing } from "@/components/lots/agency-os/SmartBriefing";
import { ContextualKpiCard } from "@/components/lots/agency-os/ContextualKpiCard";
import { IntelligentFeed } from "@/components/lots/agency-os/IntelligentFeed";
import { ClientOperationalCard } from "@/components/lots/agency-os/ClientOperationalCard";
import { AgencyFilterBar } from "@/components/lots/agency-os/AgencyFilterBar";
import { AddNoteDialog } from "@/components/lots/agency-os/AddNoteDialog";
import { CreateLeadDialog } from "@/components/lots/agency-os/CreateLeadDialog";
import { CreateProjectDialog } from "@/components/lots/agency-os/CreateProjectDialog";
import { CreateTaskDialog } from "@/components/lots/agency-os/CreateTaskDialog";
import { UpdateClientOpsDialog } from "@/components/lots/agency-os/UpdateClientOpsDialog";
import { PrioritiesSection, prioritiesQuery } from "@/components/lots/agency-os/PrioritiesSection";
import { HubIntegrationsAlertCard } from "@/components/lots/platform-hub/HubIntegrationsAlertCard";
import {
  ProductionKanbanSection,
  productionKanbanQuery,
} from "@/components/lots/agency-os/ProductionKanbanSection";
import {
  PipelineKanbanSection,
  pipelineQuery,
} from "@/components/lots/agency-os/PipelineKanbanSection";
import {
  addAgencyNote,
  createAgencyLead,
  createAgencyProject,
  createAgencyTask,
  getAgencyCentral,
  updateAgencyClientOperational,
} from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import type { AgencyCentralFilters, AgencyClientCard, ContextualKpi } from "@/modules/agency-os";
import { listServicos, listClientes } from "@/lib/admin.functions";

const centralSearchSchema = z.object({
  status: z.enum(["ativo", "implantacao", "negociacao", "pausado", "atencao"]).optional(),
  prioridade: z.enum(["A", "B", "C", "D"]).optional(),
  health: z.enum(["excellent", "good", "attention", "critical"]).optional(),
  servico: z.string().optional(),
  search: z.string().optional(),
  section: z.string().optional(),
});

const KPI_ICONS = {
  receita: DollarSign,
  clientes: Users,
  projetos: FolderKanban,
  leads: Target,
  campanhas: Radio,
} as const;

function filtersFromSearch(search: z.infer<typeof centralSearchSchema>): AgencyCentralFilters {
  return {
    status: search.status,
    prioridade: search.prioridade,
    health: search.health,
    servico: search.servico,
    search: search.search,
  };
}

function centralQuery(filters: AgencyCentralFilters) {
  return queryOptions({
    queryKey: agencyOsKeys.central(filters),
    queryFn: () => getAgencyCentral({ data: filters }),
  });
}

const servicosQuery = queryOptions({
  queryKey: ["admin", "servicos"],
  queryFn: () => listServicos(),
});

const clientPickerQuery = queryOptions({
  queryKey: ["admin", "clientes", "picker"],
  queryFn: () => listClientes(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/admin/central")({
  head: () => ({ meta: [{ title: adminTitle("Central") }] }),
  validateSearch: centralSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const filters = filtersFromSearch(deps);
    const qc = context.queryClient;
    return Promise.all([
      qc.ensureQueryData(centralQuery(filters)),
      qc.ensureQueryData(servicosQuery),
      qc.ensureQueryData(clientPickerQuery),
      qc.ensureQueryData(prioritiesQuery),
      qc.ensureQueryData(productionKanbanQuery),
      qc.ensureQueryData(pipelineQuery),
    ]);
  },
  component: CentralPage,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function CentralPage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={5} withChart={false} />}>
      <CentralContent />
    </Suspense>
  );
}

function CentralContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const { data } = useSuspenseQuery(centralQuery(filters));
  const { data: servicosData } = useSuspenseQuery(servicosQuery);
  const { data: pickerClientes } = useSuspenseQuery(clientPickerQuery);

  const [noteClient, setNoteClient] = useState<AgencyClientCard | null>(null);
  const [opsClient, setOpsClient] = useState<AgencyClientCard | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const clientOptions = useMemo(
    () =>
      (pickerClientes ?? [])
        .filter((c: { ativo?: boolean }) => c.ativo !== false)
        .map((c: { id: number; nome_cliente: string; empresa?: string | null }) => ({
          id: c.id,
          nome_cliente: c.nome_cliente,
          empresa: c.empresa ?? null,
        })),
    [pickerClientes],
  );

  const briefing = data.intelligence?.briefing ?? data.briefing;

  const setFilters = useCallback(
    (next: AgencyCentralFilters) => {
      navigate({
        search: {
          status: next.status,
          prioridade: next.prioridade,
          health: next.health,
          servico: next.servico,
          search: next.search,
          section: search.section,
        },
        replace: true,
      });
    },
    [navigate, search.section],
  );

  const applyKpiFilter = useCallback(
    (kpi: ContextualKpi) => {
      if (!kpi.filterKey || !kpi.filterValue) return;
      if (kpi.filterKey === "health") {
        setFilters({ ...filters, health: "attention" });
        return;
      }
      if (kpi.filterKey === "status") {
        setFilters({ ...filters, status: kpi.filterValue as AgencyCentralFilters["status"] });
        return;
      }
      if (kpi.filterKey === "section") {
        navigate({ search: { ...search, section: kpi.filterValue }, replace: true });
        document.getElementById(`agency-section-${kpi.filterValue}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    },
    [filters, navigate, search, setFilters],
  );

  const addNoteMutation = useMutation({
    mutationFn: (input: { cadastro_cliente_id: number; body: string }) =>
      addAgencyNote({ data: input }),
    onSuccess: async () => {
      toast.success("Observação registrada");
      setNoteClient(null);
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const updateOpsMutation = useMutation({
    mutationFn: (input: {
      id: number;
      proxima_acao?: string | null;
      status_operacional?: AgencyClientCard["status_operacional"];
      prioridade?: AgencyClientCard["prioridade"];
    }) => updateAgencyClientOperational({ data: input }),
    onSuccess: async () => {
      toast.success("Cliente atualizado");
      setOpsClient(null);
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const createLeadMutation = useMutation({
    mutationFn: (input: Parameters<typeof createAgencyLead>[0]["data"]) =>
      createAgencyLead({ data: input }),
    onSuccess: async () => {
      toast.success("Lead criado no pipeline");
      setLeadOpen(false);
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao criar lead"),
  });

  const createProjectMutation = useMutation({
    mutationFn: (input: Parameters<typeof createAgencyProject>[0]["data"]) =>
      createAgencyProject({ data: input }),
    onSuccess: async () => {
      toast.success("Projeto criado");
      setProjectOpen(false);
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao criar projeto"),
  });

  const createTaskMutation = useMutation({
    mutationFn: (input: Parameters<typeof createAgencyTask>[0]["data"]) =>
      createAgencyTask({ data: input }),
    onSuccess: async () => {
      toast.success("Tarefa criada");
      setTaskOpen(false);
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao criar tarefa"),
  });

  const servicoNames = useMemo(
    () => [...new Set((servicosData ?? []).map((s: { nome: string }) => s.nome))].sort(),
    [servicosData],
  );

  const showPriorities = !search.section || search.section === "prioridades";
  const showPipeline = !search.section || search.section === "pipeline";
  const showProducao =
    !search.section || search.section === "projetos" || search.section === "producao";
  const showClients =
    !search.section || search.section === "clientes" || search.section === "financeiro";

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Agency OS"
        title="Central"
        description={`Cockpit operacional da ${BRAND_NAME} — prioridades, pipeline, produção e carteira.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setLeadOpen(true)}
            >
              <Target className="h-3.5 w-3.5" />
              Novo lead
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setProjectOpen(true)}
            >
              <FolderKanban className="h-3.5 w-3.5" />
              Novo projeto
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setTaskOpen(true)}>
              <ListTodo className="h-3.5 w-3.5" />
              Nova tarefa
            </Button>
          </>
        }
      />

      <SmartBriefing briefing={briefing} />

      <HubIntegrationsAlertCard />

      <section aria-label="Indicadores executivos">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.kpis.map((kpi) => (
            <ContextualKpiCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              context={kpi.context}
              icon={KPI_ICONS[kpi.id as keyof typeof KPI_ICONS]}
              onClick={kpi.filterKey && kpi.filterValue ? () => applyKpiFilter(kpi) : undefined}
            />
          ))}
        </div>
      </section>

      {showPriorities && (
        <div id="agency-section-prioridades">
          <SectionCard
            title="Prioridades de hoje"
            description="O que merece sua atenção agora — ordenado por impacto."
            eyebrow="Motor operacional"
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setTaskOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova tarefa
              </Button>
            }
          >
            <PrioritiesSection />
          </SectionCard>
        </div>
      )}

      <SectionCard
        title="Atividade recente"
        description="Eventos priorizados — críticos primeiro, sem spam."
        eyebrow="Feed inteligente"
      >
        <IntelligentFeed rankedFeed={data.intelligence?.globalFeed} events={data.feed} />
      </SectionCard>

      <AgencyFilterBar filters={filters} onChange={setFilters} servicos={servicoNames} />

      {showPipeline && (
        <div id="agency-section-pipeline">
          <SectionCard
            title="Pipeline comercial"
            description="Leads com score automático — probabilidade calculada pelo sistema."
            eyebrow="Inteligência"
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setLeadOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo lead
              </Button>
            }
          >
            <Suspense fallback={<DashboardSkeleton kpiCount={0} withChart={true} />}>
              <PipelineKanbanSection onCreateLead={() => setLeadOpen(true)} />
            </Suspense>
          </SectionCard>
        </div>
      )}

      {showProducao && (
        <div id="agency-section-producao">
          <SectionCard
            title="Produção"
            description="Kanban de entregas em andamento"
            eyebrow="Workspace"
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setProjectOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo projeto
              </Button>
            }
          >
            <Suspense fallback={<DashboardSkeleton kpiCount={0} withChart={true} />}>
              <ProductionKanbanSection onCreateProject={() => setProjectOpen(true)} />
            </Suspense>
          </SectionCard>
        </div>
      )}

      {showClients && (
        <div id="agency-section-clientes">
          <SectionCard
            title="Clientes"
            description={`${data.clients.length} na carteira operacional`}
            eyebrow="Workspace"
          >
            {data.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum cliente corresponde aos filtros atuais.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.clients.map((client) => (
                  <ClientOperationalCard
                    key={client.id}
                    client={client}
                    onAddNote={setNoteClient}
                    onEditOps={setOpsClient}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <AddNoteDialog
        client={noteClient}
        open={Boolean(noteClient)}
        onOpenChange={(open) => !open && setNoteClient(null)}
        isPending={addNoteMutation.isPending}
        onSubmit={(body) => {
          if (!noteClient) return;
          addNoteMutation.mutate({ cadastro_cliente_id: noteClient.id, body });
        }}
      />

      <UpdateClientOpsDialog
        client={opsClient}
        open={Boolean(opsClient)}
        onOpenChange={(open) => !open && setOpsClient(null)}
        isPending={updateOpsMutation.isPending}
        onSubmit={(input) => updateOpsMutation.mutate(input)}
      />

      <CreateLeadDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        isPending={createLeadMutation.isPending}
        onSubmit={(input) => createLeadMutation.mutate(input)}
      />

      <CreateProjectDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        clients={clientOptions}
        isPending={createProjectMutation.isPending}
        onSubmit={(input) => createProjectMutation.mutate(input)}
      />

      <CreateTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        clients={clientOptions}
        isPending={createTaskMutation.isPending}
        onSubmit={(input) => createTaskMutation.mutate(input)}
      />
    </div>
  );
}
