import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatDueLabel, isOverdue } from "@/modules/agency-os/lib/format-time";
import { ClientHealthBadge } from "./ClientHealthBadge";
import type { AgencyPriority, ClientHealthTier } from "@/modules/agency-os";
import { PRIORITY_TYPE_META } from "@/modules/agency-os/priority-engine/config/type-meta";

export interface MiniDashboardCardAction {
  id: string;
  label: string;
  variant?: "default" | "primary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
}

export interface MiniDashboardCardProps {
  icon?: ReactNode;
  typeLabel?: string;
  clienteNome?: string;
  titulo: string;
  descricao?: string | null;
  responsavelLabel?: string | null;
  prazo?: string | null;
  prioridade?: AgencyPriority;
  healthTier?: ClientHealthTier;
  progress?: number;
  updatedAt?: string | null;
  overdue?: boolean;
  compact?: boolean;
  primaryAction?: MiniDashboardCardAction;
  quickActions?: MiniDashboardCardAction[];
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
}

export const MiniDashboardCard = memo(function MiniDashboardCard({
  icon,
  typeLabel,
  clienteNome,
  titulo,
  descricao,
  responsavelLabel,
  prazo,
  prioridade,
  healthTier,
  progress,
  updatedAt,
  overdue: overdueProp,
  compact = false,
  primaryAction,
  quickActions = [],
  onClick,
  className,
  isDragging,
}: MiniDashboardCardProps) {
  const dueLabel = formatDueLabel(prazo ?? null);
  const overdue = overdueProp ?? isOverdue(prazo ?? null);

  const body = (
    <div className={cn("flex min-w-0 flex-col gap-3", compact ? "p-3" : "p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon && (
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted/40">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {typeLabel && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {typeLabel}
                </span>
              )}
              {prioridade && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {prioridade}
                </span>
              )}
            </div>
            {clienteNome && (
              <p className="truncate text-[11px] font-medium text-primary">{clienteNome}</p>
            )}
            <p className="line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground">
              {titulo}
            </p>
            {descricao && !compact && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{descricao}</p>
            )}
          </div>
        </div>
        {healthTier && <ClientHealthBadge tier={healthTier} size="sm" />}
      </div>

      {typeof progress === "number" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progresso</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {responsavelLabel && <span>{responsavelLabel}</span>}
        {dueLabel && (
          <span className={cn(overdue && "font-semibold text-[color:var(--danger)]")}>
            {dueLabel}
          </span>
        )}
        {updatedAt && !compact && (
          <span className="text-[10px] opacity-70">
            Atualizado {new Date(updatedAt).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {(primaryAction || quickActions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          {primaryAction && (
            <button
              type="button"
              disabled={primaryAction.disabled}
              onClick={(e) => {
                e.stopPropagation();
                primaryAction.onClick?.();
              }}
              className={cn(
                "lots-focus rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                primaryAction.variant === "primary"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background hover:bg-muted/60",
              )}
            >
              {primaryAction.label}
            </button>
          )}
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick?.();
              }}
              className="lots-focus rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const surfaceClass = cn(
    "lots-surface w-full min-w-0 text-left transition-all duration-200",
    onClick && "lots-hoverable lots-focus cursor-pointer hover:border-primary/20",
    isDragging && "rotate-1 opacity-90 shadow-lg ring-2 ring-primary/25",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={surfaceClass}>
        {body}
      </button>
    );
  }

  return <article className={surfaceClass}>{body}</article>;
});

export function priorityTypeIcon(type: keyof typeof PRIORITY_TYPE_META) {
  const Icon = PRIORITY_TYPE_META[type].icon;
  return <Icon className={cn("h-4 w-4", PRIORITY_TYPE_META[type].tone)} aria-hidden />;
}
