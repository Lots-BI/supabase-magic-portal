import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { completeAgencyTask, getAgencyPriorities } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import type { OperationalPriority } from "@/modules/agency-os/priority-engine/types";
import { PrioritiesPanel } from "./PrioritiesPanel";

export const prioritiesQuery = queryOptions({
  queryKey: agencyOsKeys.priorities(),
  queryFn: () => getAgencyPriorities(),
});

export function PrioritiesSection() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(prioritiesQuery);

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeAgencyTask({ data: { id } }),
    onSuccess: () => {
      toast.success("Prioridade concluída");
      void qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const handleAction = (priority: OperationalPriority, actionId: string) => {
    if (actionId === "complete" && priority.type === "task") {
      completeMutation.mutate(priority.sourceId);
      return;
    }
    if (actionId === "open_kanban") {
      document.getElementById("agency-section-producao")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate({ to: "/admin/central/clientes/$id", params: { id: String(priority.clienteId) } });
  };

  return <PrioritiesPanel priorities={data.today} onAction={handleAction} />;
}
