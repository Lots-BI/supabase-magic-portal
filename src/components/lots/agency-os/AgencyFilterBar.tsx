import { cn } from "@/lib/utils";
import type {
  AgencyCentralFilters,
  AgencyClientStatus,
  AgencyPriority,
  ClientHealthTier,
} from "@/modules/agency-os";
import { ChevronDown, Filter, X } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const STATUS_OPTIONS: { value: AgencyClientStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "implantacao", label: "Implantação" },
  { value: "negociacao", label: "Negociação" },
  { value: "pausado", label: "Pausado" },
  { value: "atencao", label: "Atenção" },
];

const PRIORITY_OPTIONS: AgencyPriority[] = ["A", "B", "C", "D"];

const HEALTH_OPTIONS: { value: ClientHealthTier; label: string }[] = [
  { value: "excellent", label: "Excelente" },
  { value: "good", label: "Bom" },
  { value: "attention", label: "Atenção" },
  { value: "critical", label: "Crítico" },
];

export function AgencyFilterBar({
  filters,
  onChange,
  servicos,
  className,
}: {
  filters: AgencyCentralFilters;
  onChange: (next: AgencyCentralFilters) => void;
  servicos: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = [
    filters.status,
    filters.prioridade,
    filters.health,
    filters.servico,
    filters.search,
  ].filter(Boolean).length;

  const clear = () => onChange({});

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <CollapsibleTrigger className="lots-focus inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {activeCount}
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="lots-focus inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
        <input
          type="search"
          placeholder="Buscar cliente…"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="lots-focus h-9 min-w-[140px] flex-1 rounded-lg border border-border bg-background px-3 text-[13px] placeholder:text-muted-foreground/70 sm:max-w-xs"
          aria-label="Buscar cliente"
        />
      </div>
      <CollapsibleContent className="mt-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Status</span>
            <select
              className="lots-focus h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
              value={filters.status ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  status: (e.target.value as AgencyClientStatus) || undefined,
                })
              }
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Prioridade</span>
            <select
              className="lots-focus h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
              value={filters.prioridade ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  prioridade: (e.target.value as AgencyPriority) || undefined,
                })
              }
            >
              <option value="">Todas</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Saúde</span>
            <select
              className="lots-focus h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
              value={filters.health ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  health: (e.target.value as ClientHealthTier) || undefined,
                })
              }
            >
              <option value="">Todas</option>
              {HEALTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Serviço</span>
            <select
              className="lots-focus h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
              value={filters.servico ?? ""}
              onChange={(e) => onChange({ ...filters, servico: e.target.value || undefined })}
            >
              <option value="">Todos</option>
              {servicos.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
