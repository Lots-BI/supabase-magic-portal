import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/lots/PageHeader";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { DeltaPill } from "@/components/lots/DeltaPill";
import { adminTitle } from "@/lib/brand";
import {
  PLATFORM_LABEL,
  aggregateByCliente,
  deriveCpa,
  deriveCtr,
  formatMetric,
  pctDelta,
  periodRange,
  sumOverview,
  METRIC_META,
} from "@/lib/metrics";
import {
  adminPortfolioQuery,
  type PortfolioClienteAtivo,
} from "@/modules/dashboards/admin-portfolio.server";
import { slugify } from "@/lib/slug";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Target,
  UserCheck,
  Search,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ClienteAtivo = PortfolioClienteAtivo;

type SortKey = "cliente" | "spend" | "conversions" | "cpa" | "ctr" | "sessions" | "delta" | "sync";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  head: () => ({ meta: [{ title: adminTitle("Relatórios") }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(adminPortfolioQuery(30));
  },
  component: RelatoriosHub,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

function RelatoriosHub() {
  const [days, setDays] = useState<PeriodDays>(30);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dados"
        title="Relatórios"
        description={`Resumo operacional por cliente — mídia, orgânico, site, publicações e conteúdos. Clique para abrir.`}
        actions={<PeriodToggle value={days} onChange={setDays} />}
      />

      <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
        <HubBody days={days} />
      </Suspense>
    </div>
  );
}

function HubBody({ days }: { days: PeriodDays }) {
  const { data: portfolio } = useSuspenseQuery(adminPortfolioQuery(days));
  const ativos = portfolio.ativos;
  const overview = portfolio.overview;
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const period = useMemo(() => periodRange(days), [days]);
  const current = overview.filter((r) => r.data >= period.from && r.data <= period.to);
  const previous = overview.filter((r) => r.data >= period.prevFrom && r.data <= period.prevTo);
  const cT = sumOverview(current);
  const pT = sumOverview(previous);
  const cpa = deriveCpa(cT.spend, cT.conversions);

  const agregados = aggregateByCliente(current);
  const prevByCliente = useMemo(() => {
    const m = new Map<string, ReturnType<typeof sumOverview>>();
    for (const c of aggregateByCliente(previous)) m.set(c.cliente, c.totals);
    return m;
  }, [previous]);

  const ativosByName = useMemo(() => {
    const m = new Map<string, ClienteAtivo>();
    for (const a of ativos) m.set(a.cliente, a);
    return m;
  }, [ativos]);

  const todos = useMemo(() => {
    const seen = new Set(agregados.map((a) => a.cliente));
    const sem = ativos
      .filter((a) => !seen.has(a.cliente))
      .map((a) => ({
        cliente: a.cliente,
        totals: sumOverview([]),
        ctr: 0,
        cpa: 0,
      }));
    return [...agregados, ...sem];
  }, [agregados, ativos]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle ? todos.filter((c) => c.cliente.toLowerCase().includes(needle)) : todos;

    const decorated = filtered.map((c) => {
      const prev = prevByCliente.get(c.cliente);
      const spendDelta = prev ? pctDelta(c.totals.spend, prev.spend) : null;
      const ativo = ativosByName.get(c.cliente);
      return { ...c, spendDelta, ativo };
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return decorated.sort((a, b) => {
      switch (sortKey) {
        case "cliente":
          return a.cliente.localeCompare(b.cliente, "pt-BR") * dir;
        case "spend":
          return (a.totals.spend - b.totals.spend) * dir;
        case "conversions":
          return (a.totals.conversions - b.totals.conversions) * dir;
        case "cpa":
          return (a.cpa - b.cpa) * dir;
        case "ctr":
          return (a.ctr - b.ctr) * dir;
        case "sessions":
          return (a.totals.sessions - b.totals.sessions) * dir;
        case "delta":
          return ((a.spendDelta ?? -Infinity) - (b.spendDelta ?? -Infinity)) * dir;
        case "sync": {
          const ta = a.ativo?.ultima_data_recebida ?? "";
          const tb = b.ativo?.ultima_data_recebida ?? "";
          return ta.localeCompare(tb) * dir;
        }
        default:
          return 0;
      }
    });
  }, [todos, q, sortKey, sortDir, prevByCliente, ativosByName]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "cliente" ? "asc" : "desc");
  }

  return (
    <div className="space-y-7">
      <section className="grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Investimento"
          value={formatMetric("spend", cT.spend)}
          icon={DollarSign}
          delta={pctDelta(cT.spend, pT.spend)}
          description={METRIC_META.spend.description}
        />
        <StatCard
          label="Conversões"
          value={formatMetric("conversions", cT.conversions)}
          icon={Target}
          delta={pctDelta(cT.conversions, pT.conversions)}
          description={METRIC_META.conversions.description}
        />
        <StatCard
          label="CPA"
          value={cpa > 0 ? formatMetric("spend", cpa) : "—"}
          icon={Target}
          description={METRIC_META.conversions.description}
          positiveIsGood={false}
        />
        <StatCard
          label="Clientes com dado"
          value={agregados.length}
          icon={UserCheck}
          hint={`${ativos.length} ativos no total`}
        />
      </section>

      <SectionCard
        eyebrow="Portfólio"
        title="Comparativo por cliente"
        description="Clique na linha para abrir o relatório operacional do cliente."
        bodyClassName="px-0 py-0"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente…"
            className="h-7 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {rows.length} {rows.length === 1 ? "cliente" : "clientes"}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhum cliente no período.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead
                  label="Cliente"
                  active={sortKey === "cliente"}
                  dir={sortDir}
                  onClick={() => toggleSort("cliente")}
                />
                <SortHead
                  label="Spend"
                  active={sortKey === "spend"}
                  dir={sortDir}
                  onClick={() => toggleSort("spend")}
                  align="right"
                />
                <SortHead
                  label="Conv."
                  active={sortKey === "conversions"}
                  dir={sortDir}
                  onClick={() => toggleSort("conversions")}
                  align="right"
                />
                <SortHead
                  label="CPA"
                  active={sortKey === "cpa"}
                  dir={sortDir}
                  onClick={() => toggleSort("cpa")}
                  align="right"
                />
                <SortHead
                  label="CTR"
                  active={sortKey === "ctr"}
                  dir={sortDir}
                  onClick={() => toggleSort("ctr")}
                  align="right"
                />
                <SortHead
                  label="Sessões"
                  active={sortKey === "sessions"}
                  dir={sortDir}
                  onClick={() => toggleSort("sessions")}
                  align="right"
                />
                <TableHead className="hidden xl:table-cell">Plataformas</TableHead>
                <SortHead
                  label="Δ spend"
                  active={sortKey === "delta"}
                  dir={sortDir}
                  onClick={() => toggleSort("delta")}
                />
                <SortHead
                  label="Sync"
                  active={sortKey === "sync"}
                  dir={sortDir}
                  onClick={() => toggleSort("sync")}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow
                  key={c.cliente}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() =>
                    void navigate({
                      to: "/cliente/$cliente/relatorio",
                      params: { cliente: slugify(c.cliente) },
                      search: {
                        preset: days === 7 ? "last_7" : days === 90 ? "last_90" : "last_30",
                      },
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void navigate({
                        to: "/cliente/$cliente/relatorio",
                        params: { cliente: slugify(c.cliente) },
                        search: {
                          preset: days === 7 ? "last_7" : days === 90 ? "last_90" : "last_30",
                        },
                      });
                    }
                  }}
                >
                  <TableCell className="font-medium text-foreground">{c.cliente}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMetric("spend", c.totals.spend)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMetric("conversions", c.totals.conversions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.cpa > 0 ? formatMetric("spend", c.cpa) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.totals.impressions > 0 ? `${c.ctr.toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMetric("sessions", c.totals.sessions)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(c.ativo?.plataformas_ativas ?? []).slice(0, 4).map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          {PLATFORM_LABEL[p as keyof typeof PLATFORM_LABEL] ?? p}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DeltaPill delta={c.spendDelta} size="sm" />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                    {c.ativo?.ultima_data_recebida ? fmtRelDay(c.ativo.ultima_data_recebida) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

function SortHead({
  label,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "right";
}) {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 font-medium",
          align === "right" && "ml-auto",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

function fmtRelDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 7) return `há ${diff}d`;
  return d.toLocaleDateString("pt-BR");
}
