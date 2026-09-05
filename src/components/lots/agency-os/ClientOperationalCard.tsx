import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { AgencyClientCard } from "@/modules/agency-os";
import { ClientHealthBadge } from "./ClientHealthBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ExternalLink,
  Pencil,
  MessageSquarePlus,
  Megaphone,
  Wallet,
} from "lucide-react";

const STATUS_LABEL: Record<AgencyClientCard["status_operacional"], string> = {
  ativo: "Ativo",
  implantacao: "Implantação",
  negociacao: "Negociação",
  pausado: "Pausado",
  atencao: "Atenção",
};

const STATUS_DOT: Record<AgencyClientCard["status_operacional"], string> = {
  ativo: "bg-success",
  implantacao: "bg-info",
  negociacao: "bg-primary",
  pausado: "bg-warning",
  atencao: "bg-danger",
};

const currency = (v: number | null) =>
  v != null
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : "—";

export const ClientOperationalCard = memo(function ClientOperationalCard({
  client,
  onAddNote,
  onEditOps,
  className,
}: {
  client: AgencyClientCard;
  onAddNote?: (client: AgencyClientCard) => void;
  onEditOps?: (client: AgencyClientCard) => void;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "lots-surface lots-hoverable group flex min-w-0 flex-col gap-4 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/central/clientes/$id"
              params={{ id: String(client.id) }}
              className="lots-focus truncate font-display text-[15px] font-semibold text-foreground hover:text-primary"
            >
              {client.nome_cliente}
            </Link>
            <ClientHealthBadge tier={client.health_tier} size="sm" />
          </div>
          {client.empresa && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{client.empresa}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onEditOps && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-60 group-hover:opacity-100"
              aria-label="Editar operação"
              onClick={() => onEditOps(client)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onAddNote && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-60 group-hover:opacity-100"
              aria-label="Adicionar observação"
              onClick={() => onAddNote(client)}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-60 group-hover:opacity-100"
                aria-label="Ações do cliente"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/admin/central/clientes/$id" params={{ id: String(client.id) }}>
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Abrir workspace
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/clientes/$id" params={{ id: String(client.id) }}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAddNote?.(client)}>
                <MessageSquarePlus className="mr-2 h-3.5 w-3.5" />
                Adicionar observação
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Megaphone className="mr-2 h-3.5 w-3.5" />
                Criar campanha
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Wallet className="mr-2 h-3.5 w-3.5" />
                Ver financeiro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">MRR</p>
          <p className="mt-0.5 font-display font-semibold tabular-nums text-foreground">
            {currency(client.valor_mensal)}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Prioridade</p>
          <p className="mt-0.5 font-semibold text-foreground">{client.prioridade}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-foreground">
            <span
              className={cn("h-2 w-2 rounded-full", STATUS_DOT[client.status_operacional])}
              aria-hidden
            />
            {STATUS_LABEL[client.status_operacional]}
          </p>
        </div>
      </div>

      {client.proxima_acao && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">
          <span className="font-medium text-muted-foreground">Próxima ação · </span>
          {client.proxima_acao}
        </p>
      )}

      {client.servicos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {client.servicos.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-[10.5px] text-muted-foreground"
            >
              {s}
            </span>
          ))}
          {client.servicos.length > 4 && (
            <span className="px-1 text-[10.5px] text-muted-foreground">
              +{client.servicos.length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
});
