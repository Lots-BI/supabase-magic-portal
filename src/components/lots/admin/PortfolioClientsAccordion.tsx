import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { DeltaPill } from "@/components/lots/DeltaPill";
import { SectionCard } from "@/components/lots/SectionCard";
import { ClientePlatformSyncButton } from "@/components/lots/ClientePlatformSyncButton";
import {
  lookupCadastroId,
  type ClienteSyncPlatform,
} from "@/modules/dashboards/cliente-sync-platform";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  formatMetric,
  pctDelta,
  platformBreakdownByCliente,
  type ClientPlatformBreakdown,
  type OverviewRow,
} from "@/lib/metrics";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

type ClientRow = ClientPlatformBreakdown & { spendDelta: number | null };

interface PlatformCard {
  key: ClienteSyncPlatform;
  label: string;
  primary: string;
  primaryLabel: string;
  secondary: string;
  secondaryLabel: string;
}

function platformCards(row: ClientPlatformBreakdown): PlatformCard[] {
  return [
    {
      key: "meta_ads",
      label: "Meta Ads",
      primary: formatMetric("spend", row.meta.spend),
      primaryLabel: "Investimento",
      secondary: formatMetric("conversions", row.meta.results),
      secondaryLabel: "Resultados",
    },
    {
      key: "google_ads",
      label: "Google Ads",
      primary: formatMetric("spend", row.google.spend),
      primaryLabel: "Investimento",
      secondary: formatMetric("conversions", row.google.conversions),
      secondaryLabel: "Conversões",
    },
    {
      key: "ga4",
      label: "Google Analytics 4",
      primary: formatMetric("sessions", row.ga4.sessions),
      primaryLabel: "Sessões",
      secondary: formatMetric("conversions", row.ga4.conversions),
      secondaryLabel: "Conversões",
    },
    {
      key: "instagram",
      label: "Instagram",
      primary: formatMetric("reach", row.instagram.reach),
      primaryLabel: "Alcance",
      secondary: formatMetric("engagement", row.instagram.interactions),
      secondaryLabel: "Interações",
    },
  ];
}

export function PortfolioClientsAccordion({
  current,
  previous,
  cadastroByName,
}: {
  current: OverviewRow[];
  previous: OverviewRow[];
  cadastroByName: ReadonlyMap<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [openCliente, setOpenCliente] = useState<string | null>(null);

  const rows = useMemo(() => {
    const prev = new Map(
      platformBreakdownByCliente(previous).map((row) => [row.cliente, row] as const),
    );
    return platformBreakdownByCliente(current)
      .map((row) => ({
        ...row,
        spendDelta: pctDelta(row.spend, prev.get(row.cliente)?.spend ?? 0),
      }))
      .sort((a, b) => b.spend - a.spend || a.cliente.localeCompare(b.cliente, "pt-BR"));
  }, [current, previous]);

  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const visible = needle
    ? rows.filter((row) => row.cliente.toLocaleLowerCase("pt-BR").includes(needle))
    : rows;

  return (
    <SectionCard
      eyebrow="Portfólio"
      title="Por cliente"
      description="Abra um cliente para ver as plataformas e puxar a coleta só daquela conta."
      bodyClassName="px-0 py-0"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente…"
          aria-label="Buscar cliente"
          className="h-7 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {visible.length} {visible.length === 1 ? "cliente" : "clientes"}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Nenhum cliente no período.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          <li className="hidden items-center gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
            <span className="w-8 shrink-0" />
            <span className="min-w-0 flex-1">Cliente</span>
            <span className="flex shrink-0 items-center gap-4">
              <span className="w-[6.5rem] text-right">Investimento</span>
              <span className="w-[4.5rem] text-right">Conversões</span>
              <span className="w-[4.75rem] text-right">Δ invest.</span>
            </span>
          </li>
          {visible.map((row) => (
            <ClientAccordionRow
              key={row.cliente}
              row={row}
              cadastroId={lookupCadastroId(cadastroByName, row.cliente)}
              open={openCliente === row.cliente}
              onOpenChange={(next) => setOpenCliente(next ? row.cliente : null)}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ClientAccordionRow({
  row,
  cadastroId,
  open,
  onOpenChange,
}: {
  row: ClientRow;
  cadastroId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cards = platformCards(row);

  return (
    <li>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
          <CollapsibleTrigger
            className="lots-focus inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label={open ? `Fechar ${row.cliente}` : `Abrir plataformas de ${row.cliente}`}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
          </CollapsibleTrigger>
          <Link
            to="/cliente/$cliente"
            params={{ cliente: slugify(row.cliente) }}
            className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground hover:underline"
          >
            {row.cliente}
          </Link>
          <CollapsibleTrigger
            className="lots-focus ml-10 grid min-w-0 basis-full grid-cols-3 gap-2 rounded-md px-1 py-1 text-[13px] hover:bg-muted/60 sm:ml-0 sm:flex sm:basis-auto sm:items-center sm:gap-4"
            aria-label={`Abrir plataformas de ${row.cliente}`}
          >
            <span className="min-w-0 text-right sm:w-[6.5rem]">
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                Investimento
              </span>
              <span className="tabular-nums text-foreground">
                {formatMetric("spend", row.spend)}
              </span>
            </span>
            <span className="min-w-0 text-right sm:w-[4.5rem]">
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                Conversões
              </span>
              <span className="tabular-nums text-foreground">
                {formatMetric("conversions", row.conversions)}
              </span>
            </span>
            <span className="flex min-w-0 justify-end sm:w-[4.75rem]">
              <DeltaPill delta={row.spendDelta} />
            </span>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="grid gap-3 border-t border-border bg-muted/30 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.key}
                className="rounded-lg border border-border bg-background px-3 py-3"
              >
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
                  {card.primary}
                </p>
                <p className="text-[12px] text-muted-foreground">{card.primaryLabel}</p>
                <p className="mt-2 text-[13px] tabular-nums text-foreground">
                  {card.secondary}{" "}
                  <span className="text-muted-foreground">{card.secondaryLabel}</span>
                </p>
                {cadastroId != null ? (
                  <div className="mt-3">
                    <ClientePlatformSyncButton
                      cadastroClienteId={cadastroId}
                      platform={card.key}
                      compact
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
