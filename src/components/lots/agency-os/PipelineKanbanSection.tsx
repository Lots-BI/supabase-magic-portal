import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { GenericKanbanBoard } from "@/components/lots/kanban/GenericKanbanBoard";
import { MiniDashboardCard } from "@/components/lots/agency-os/MiniDashboardCard";
import {
  convertLeadToClient,
  getPipelineKanban,
  moveAgencyLead,
} from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import type { AgencyLead, AgencyPipelineStage } from "@/modules/agency-os/types/leads";
import { formatDueLabel } from "@/modules/agency-os/lib/format-time";

const pipelineQuery = queryOptions({
  queryKey: agencyOsKeys.pipeline(),
  queryFn: () => getPipelineKanban(),
});

export function PipelineKanbanSection({ onCreateLead }: { onCreateLead?: () => void } = {}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: board } = useSuspenseQuery(pipelineQuery);
  const totalItems = board.columns.reduce((n, c) => n + c.items.length, 0);

  const moveMutation = useMutation({
    mutationFn: (input: {
      id: string;
      pipeline_stage: AgencyPipelineStage;
      kanban_ordem: number;
    }) => moveAgencyLead({ data: input }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: agencyOsKeys.pipeline() });
      const prev = qc.getQueryData(pipelineQuery.queryKey);
      qc.setQueryData(pipelineQuery.queryKey, (old: typeof board | undefined) => {
        if (!old) return old;
        const item = old.columns.flatMap((c) => c.items).find((i) => i.id === input.id);
        if (!item) return old;
        return {
          columns: old.columns.map((col) => {
            if (col.id === input.pipeline_stage) {
              return {
                ...col,
                items: [
                  ...col.items.filter((i) => i.id !== input.id),
                  { ...item, pipeline_stage: input.pipeline_stage },
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
      if (ctx?.prev) qc.setQueryData(pipelineQuery.queryKey, ctx.prev);
      toast.error(e instanceof Error ? e.message : "Falha ao mover lead");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (leadId: string) => convertLeadToClient({ data: { leadId } }),
    onSuccess: async (result) => {
      toast.success("Lead convertido em cliente");
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
      if (result.cadastro_cliente_id) {
        navigate({
          to: "/admin/central/clientes/$id",
          params: { id: String(result.cadastro_cliente_id) },
        });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na conversão"),
  });

  return (
    <>
      {totalItems === 0 && (
        <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Pipeline vazio — cadastre seu primeiro lead.
          </p>
          {onCreateLead && (
            <button
              type="button"
              className="lots-focus mt-2 text-sm font-medium text-primary hover:underline"
              onClick={onCreateLead}
            >
              Criar lead
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
            pipeline_stage: toColumnId as AgencyPipelineStage,
            kanban_ordem: targetCol?.items.length ?? 0,
          });
        }}
        renderCard={(lead: AgencyLead, { isDragging }) => (
          <LeadKanbanCard
            lead={lead}
            isDragging={isDragging}
            onConvert={() => convertMutation.mutate(lead.id)}
            converting={convertMutation.isPending}
          />
        )}
      />
    </>
  );
}

function LeadKanbanCard({
  lead,
  isDragging,
  onConvert,
  converting,
}: {
  lead: AgencyLead;
  isDragging: boolean;
  onConvert: () => void;
  converting: boolean;
}) {
  const tier =
    lead.probabilidade_efetiva >= 80
      ? "excellent"
      : lead.probabilidade_efetiva >= 60
        ? "good"
        : lead.probabilidade_efetiva >= 40
          ? "attention"
          : "critical";

  return (
    <MiniDashboardCard
      compact
      isDragging={isDragging}
      icon={<Target className="h-4 w-4 text-primary" />}
      typeLabel={`Pipeline · ${lead.origem}`}
      clienteNome={lead.empresa ?? undefined}
      titulo={lead.nome}
      descricao={[
        lead.proxima_acao,
        lead.valor_estimado != null
          ? lead.valor_estimado.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      responsavelLabel={lead.proximo_contato ? formatDueLabel(lead.proximo_contato) : null}
      prazo={lead.proximo_contato}
      healthTier={tier}
      progress={lead.probabilidade_efetiva}
      updatedAt={lead.ultima_interacao}
      primaryAction={
        lead.pipeline_stage === "contrato" || lead.pipeline_stage === "onboarding"
          ? {
              id: "convert",
              label: converting ? "Convertendo…" : "Converter",
              variant: "primary",
              onClick: onConvert,
              disabled: converting,
            }
          : undefined
      }
    />
  );
}

export { pipelineQuery };
