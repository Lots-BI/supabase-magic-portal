import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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

  if (dashQ.isLoading) return <ApprovalPanelSkeleton rows={4} />;

  const data = dashQ.data;
  if (!data) return null;

  return (
    <section className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {data.byClient.length === 0 ? (
        <div className="flex h-[120px] w-full items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">
          —
        </div>
      ) : (
        data.byClient.map((row) => (
          <button
            key={row.cadastro_cliente_id}
            type="button"
            onClick={() => onSelectCliente(row.cadastro_cliente_id)}
            className="flex h-[120px] w-[168px] shrink-0 flex-col justify-between rounded-3xl border border-border bg-card p-4 text-left shadow-sm"
          >
            <p className="line-clamp-2 text-sm font-semibold">{row.cliente_nome}</p>
            <p className="text-3xl font-display font-semibold tabular-nums">{row.count}</p>
          </button>
        ))
      )}
    </section>
  );
}
