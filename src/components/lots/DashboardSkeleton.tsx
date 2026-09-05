import { cn } from "@/lib/utils";

export interface DashboardSkeletonProps {
  /** Número de cards KPI no topo. */
  kpiCount?: number;
  /** Inclui bloco de gráfico grande. */
  withChart?: boolean;
  className?: string;
}

/** Skeleton padronizado para dashboards (KPIs + gráfico opcional). */
export function DashboardSkeleton({
  kpiCount = 4,
  withChart = true,
  className,
}: DashboardSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-label="Carregando dados">
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          kpiCount >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {Array.from({ length: kpiCount }).map((_, i) => (
          <div key={i} className="lots-surface h-28">
            <div className="lots-skeleton m-4 h-3 w-1/2" />
            <div className="lots-skeleton mx-4 mt-3 h-6 w-2/3" />
          </div>
        ))}
      </div>
      {withChart && (
        <div className="lots-surface h-[320px]">
          <div className="lots-skeleton m-5 h-3 w-40" />
          <div className="lots-skeleton mx-5 mt-6 h-[220px] w-[calc(100%-2.5rem)]" />
        </div>
      )}
    </div>
  );
}
