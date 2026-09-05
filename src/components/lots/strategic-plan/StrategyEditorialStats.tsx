import { Link } from "@tanstack/react-router";
import type { EstrategiaEditorialStats } from "@/lib/strategic-plan/types";

export function StrategyEditorialStats({
  stats,
  estrategiaId,
  adminLink,
}: {
  stats: EstrategiaEditorialStats;
  estrategiaId: string;
  adminLink?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        <strong className="text-foreground">{stats.total}</strong> conteúdos vinculados
      </span>
      <span>·</span>
      <span>
        <strong className="text-foreground">{stats.publicados}</strong> publicados
      </span>
      <span>·</span>
      <span>
        <strong className="text-foreground">{stats.aprovados}</strong> aprovados
      </span>
      <span>·</span>
      <span>
        <strong className="text-foreground">{stats.aguardando}</strong> aguardando
      </span>
      {adminLink && stats.total > 0 && (
        <Link
          to="/admin/aprovacoes"
          search={{ tab: "calendar", estrategia: estrategiaId }}
          className="text-primary hover:underline"
        >
          Ver no calendário
        </Link>
      )}
    </div>
  );
}
