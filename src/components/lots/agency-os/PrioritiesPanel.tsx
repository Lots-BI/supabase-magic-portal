import { memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MiniDashboardCard, priorityTypeIcon } from "./MiniDashboardCard";
import { PRIORITY_TYPE_META } from "@/modules/agency-os/priority-engine/config/type-meta";
import type { OperationalPriority } from "@/modules/agency-os/priority-engine/types";

export const PriorityItemCard = memo(function PriorityItemCard({
  priority,
  onAction,
}: {
  priority: OperationalPriority;
  onAction: (priority: OperationalPriority, actionId: string) => void;
}) {
  const navigate = useNavigate();
  const meta = PRIORITY_TYPE_META[priority.type];

  return (
    <MiniDashboardCard
      icon={priorityTypeIcon(priority.type)}
      typeLabel={meta.label}
      clienteNome={priority.clienteNome}
      titulo={priority.titulo}
      descricao={priority.descricao}
      responsavelLabel={priority.responsavelLabel ?? undefined}
      prazo={priority.prazo}
      prioridade={priority.clientPriority}
      healthTier={priority.healthTier}
      progress={priority.progress}
      updatedAt={priority.updatedAt}
      primaryAction={{
        ...priority.primaryAction,
        onClick: () => onAction(priority, priority.primaryAction.id),
      }}
      quickActions={priority.quickActions.map((a) => ({
        ...a,
        onClick: () => onAction(priority, a.id),
      }))}
      onClick={() =>
        navigate({ to: "/admin/central/clientes/$id", params: { id: String(priority.clienteId) } })
      }
    />
  );
});

export function PrioritiesPanel({
  priorities,
  onAction,
  emptyMessage = "Nenhuma prioridade para hoje. A operação está sob controle.",
}: {
  priorities: OperationalPriority[];
  onAction: (priority: OperationalPriority, actionId: string) => void;
  emptyMessage?: string;
}) {
  if (priorities.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3" role="list">
      {priorities.map((p) => (
        <li key={p.id}>
          <PriorityItemCard priority={p} onAction={onAction} />
        </li>
      ))}
    </ul>
  );
}
