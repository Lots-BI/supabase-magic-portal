import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Clock, Layers } from "lucide-react";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { ApprovalPanelSkeleton } from "@/components/lots/approval/shared/ApprovalPanelSkeleton";
import { getApprovalOpsDashboard } from "@/modules/approval/dashboard/dashboard.server";

export function ApprovalAgencyQueue({
  onSelectCliente,
}: {
  onSelectCliente: (id: number) => void;
}) {
  const dashFn = useServerFn(getApprovalOpsDashboard);
  const dashQ = useQuery({
    queryKey: ["approval", "ops-dashboard", "all"],
    queryFn: () => dashFn({ data: {} }),
    staleTime: 30_000,
  });

  if (dashQ.isLoading) return <ApprovalPanelSkeleton rows={6} />;

  const data = dashQ.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Aguardando aprovação" value={data.awaitingApproval} icon={Clock} />
        <StatCard label="Pedidos de alteração" value={data.changesRequested} icon={Layers} />
        <StatCard label="Atrasados" value={data.overdueCount} icon={CalendarClock} />
        <StatCard label="Cards no pipeline" value={data.totalCards} icon={Layers} />
      </section>

      <SectionCard
        title="Fila por cliente"
        description="Abra o workspace do cliente a partir da fila da agência."
        bodyClassName="px-0 py-0"
      >
        {data.byClient.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Nenhum card no pipeline no momento.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.byClient.map((row) => (
              <li key={row.cadastro_cliente_id}>
                <button
                  type="button"
                  onClick={() => onSelectCliente(row.cadastro_cliente_id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-[13px] transition-colors hover:bg-muted/40"
                >
                  <span className="truncate font-medium text-foreground">{row.cliente_nome}</span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {row.count} {row.count === 1 ? "card" : "cards"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
