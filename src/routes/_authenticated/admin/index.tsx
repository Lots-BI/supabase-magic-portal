import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listClientes } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lots/PageHeader";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { DeltaPill } from "@/components/lots/DeltaPill";
import { ChartFrame, ChartLegendItem } from "@/components/lots/charts/ChartFrame";
import { getSeriesColor } from "@/components/lots/charts/chart-colors";
import { DonutChartLots } from "@/components/lots/charts/DonutChartLots";
import { AreaChartLotsLazy } from "@/components/lots/charts/AreaChartLotsLazy";
import { adminTitle, BRAND_NAME } from "@/lib/brand";
import {
  PLATFORM_LABEL,
  dailyFromOverview,
  deriveCpa,
  deriveCtr,
  formatMetric,
  pctDelta,
  periodRange,
  spendShareByPlatform,
  sumOverview,
  aggregateByCliente,
  METRIC_META,
  OVERVIEW_CLIENTE_SELECT,
  type OverviewRow,
} from "@/lib/metrics";
import { slugify } from "@/lib/slug";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { getApprovalOpsDashboard } from "@/modules/approval/dashboard/dashboard.server";
import { getHubAgencyAlerts } from "@/modules/platform-hub-admin/hub-admin.server";
import { hubAdminKeys } from "@/modules/platform-hub-admin/query-keys";
import {
  DollarSign,
  Activity,
  Target,
  Compass,
  Sparkles,
  Percent,
  Clock,
  ClipboardCheck,
  Plug,
  RadioTower,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
  total_registros: number;
};

const clientesAdminQuery = queryOptions({
  queryKey: ["admin", "clientes"],
  queryFn: () => listClientes(),
});

const clientesAtivosQuery = queryOptions({
  queryKey: ["vw_clientes_ativos"],
  queryFn: async (): Promise<ClienteAtivo[]> => {
    const { data, error } = await supabase
      .from("vw_clientes_ativos")
      .select("cliente,ultima_data_recebida,ultima_ingestao,plataformas_ativas,total_registros")
      .order("ultima_data_recebida", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ClienteAtivo[];
  },
});

const overviewAdminQuery = (days: PeriodDays) =>
  queryOptions({
    queryKey: ["admin", "overview", days],
    queryFn: async (): Promise<OverviewRow[]> => {
      const { prevFrom, to } = periodRange(days);
      const { data, error } = await supabase
        .from("vw_overview_cliente")
        .select(OVERVIEW_CLIENTE_SELECT)
        .gte("data", prevFrom)
        .lte("data", to)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OverviewRow[];
    },
  });

const STALE_MS = 48 * 3600_000;

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: adminTitle("Visão geral") }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesAdminQuery);
    void context.queryClient.ensureQueryData(clientesAtivosQuery);
    void context.queryClient.ensureQueryData(overviewAdminQuery(30));
  },
  component: AdminOverview,
  errorComponent: ({ error }) => (
    <div className="lots-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

function AdminOverview() {
  const [days, setDays] = useState<PeriodDays>(30);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dados"
        title="Visão geral"
        description={`Pulso do portfólio ${BRAND_NAME} — o que precisa de atenção hoje.`}
        actions={<PeriodToggle value={days} onChange={setDays} />}
      />

      <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
        <OverviewBody days={days} />
      </Suspense>
    </div>
  );
}

function OverviewBody({ days }: { days: PeriodDays }) {
  const { data: clientes } = useSuspenseQuery(clientesAdminQuery);
  const { data: ativos } = useSuspenseQuery(clientesAtivosQuery);
  const { data: overview } = useSuspenseQuery(overviewAdminQuery(days));
  const opsFn = useServerFn(getApprovalOpsDashboard);

  const opsQ = useQuery({
    queryKey: ["approval", "ops-dashboard", "all"],
    queryFn: () => opsFn({ data: {} }),
    staleTime: 60_000,
  });

  const alertsQ = useQuery({
    queryKey: [...hubAdminKeys.all, "agency-alerts"],
    queryFn: () => getHubAgencyAlerts(),
    staleTime: 60_000,
  });

  const period = useMemo(() => periodRange(days), [days]);
  const current = overview.filter((r) => r.data >= period.from && r.data <= period.to);
  const previous = overview.filter((r) => r.data >= period.prevFrom && r.data <= period.prevTo);
  const cT = sumOverview(current);
  const pT = sumOverview(previous);

  const daily = dailyFromOverview(current, period);
  const share = spendShareByPlatform(current);
  const ctr = deriveCtr(cT.impressions, cT.clicks);
  const prevCtr = deriveCtr(pT.impressions, pT.clicks);
  const cpa = deriveCpa(cT.spend, cT.conversions);

  const ultimaSync = ativos
    .map((a) => a.ultima_ingestao)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  const idByNome = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clientes as { id: number; nome_cliente: string }[]) {
      m.set(c.nome_cliente, c.id);
    }
    return m;
  }, [clientes]);

  const staleAccounts = useMemo(
    () =>
      ativos.filter((a) => {
        if (!a.ultima_ingestao) return true;
        return Date.now() - new Date(a.ultima_ingestao).getTime() > STALE_MS;
      }),
    [ativos],
  );

  const awaiting = opsQ.data?.awaitingApproval ?? 0;
  const failedConnections = alertsQ.data?.unhealthy.length ?? 0;

  const attentionItems = useMemo(() => {
    const items: Array<{
      key: string;
      cliente: string;
      reason: string;
      to: string;
      search?: Record<string, number>;
    }> = [];

    const prevByCliente = new Map(aggregateByCliente(previous).map((c) => [c.cliente, c] as const));
    for (const c of aggregateByCliente(current)) {
      const prev = prevByCliente.get(c.cliente);
      if (!prev || prev.cpa <= 0 || c.cpa <= 0) continue;
      const delta = pctDelta(c.cpa, prev.cpa);
      if (delta != null && delta >= 40) {
        items.push({
          key: `cpa-${c.cliente}`,
          cliente: c.cliente,
          reason: `CPA +${delta.toFixed(0)}% vs período anterior`,
          to: "/cliente/$cliente",
        });
      }
    }

    for (const a of staleAccounts.slice(0, 6)) {
      items.push({
        key: `sync-${a.cliente}`,
        cliente: a.cliente,
        reason: a.ultima_ingestao
          ? `Sync atrasada · ${relTime(a.ultima_ingestao)}`
          : "Sem ingestão registrada",
        to: "/cliente/$cliente",
      });
    }

    for (const row of (opsQ.data?.byClient ?? []).slice(0, 4)) {
      const already = items.some((i) => i.cliente === row.cliente_nome);
      if (already || row.count <= 0) continue;
      items.push({
        key: `cards-${row.cadastro_cliente_id}`,
        cliente: row.cliente_nome,
        reason: `${row.count} ${row.count === 1 ? "card" : "cards"} no pipeline`,
        to: "/admin/aprovacoes",
        search: { cliente: row.cadastro_cliente_id },
      });
    }

    return items.slice(0, 8);
  }, [current, previous, staleAccounts, opsQ.data?.byClient]);

  return (
    <div className="space-y-7">
      <p className="text-[12px] text-muted-foreground">
        Última sync:{" "}
        <span className="font-medium text-foreground">{relTime(ultimaSync ?? null)}</span>
      </p>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Atenção">
        <AttentionChip
          to="/admin/aprovacoes"
          icon={ClipboardCheck}
          label={awaiting === 1 ? "1 aguardando aprovação" : `${awaiting} aguardando aprovação`}
          tone={awaiting > 0 ? "warn" : "ok"}
        />
        <AttentionChip
          to="/admin/relatorios"
          icon={RadioTower}
          label={
            staleAccounts.length === 1
              ? "1 conta sem sync >48h"
              : `${staleAccounts.length} contas sem sync >48h`
          }
          tone={staleAccounts.length > 0 ? "warn" : "ok"}
        />
        <AttentionChip
          to="/admin/conexoes/health"
          icon={Plug}
          label={
            failedConnections === 1
              ? "1 conexão com falha"
              : `${failedConnections} conexões com falha`
          }
          tone={failedConnections > 0 ? "warn" : "ok"}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Investimento"
          value={formatMetric("spend", cT.spend)}
          icon={DollarSign}
          emphasis="hero"
          delta={pctDelta(cT.spend, pT.spend)}
          description={METRIC_META.spend.description}
          hint={`Meta ${formatMetric("spend", cT.meta_spend)} · Google ${formatMetric("spend", cT.google_spend)}`}
        />
        <StatCard
          label="Conversões"
          value={formatMetric("conversions", cT.conversions)}
          icon={Target}
          delta={pctDelta(cT.conversions, pT.conversions)}
          description={METRIC_META.conversions.description}
          hint={cpa > 0 ? `CPA ${formatMetric("spend", cpa)}` : undefined}
        />
        <StatCard
          label="Sessões GA4"
          value={formatMetric("sessions", cT.sessions)}
          icon={Activity}
          delta={pctDelta(cT.sessions, pT.sessions)}
          description={METRIC_META.sessions.description}
        />
        <StatCard
          label="CTR consolidado"
          value={cT.impressions > 0 ? `${ctr.toFixed(2)}%` : "—"}
          icon={Percent}
          delta={pctDelta(ctr, prevCtr)}
          description={METRIC_META.ctr.description}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartFrame
          eyebrow="Evolução"
          title="Investimento diário consolidado"
          description={`Todas as contas ${BRAND_NAME}, soma diária Meta + Google + Conversões.`}
          headline={formatMetric("spend", cT.spend)}
          meta={<DeltaPill delta={pctDelta(cT.spend, pT.spend)} showSuffix />}
          legend={
            <>
              <ChartLegendItem
                color={getSeriesColor("primary")}
                label="Meta Ads"
                value={formatMetric("spend", cT.meta_spend)}
              />
              <ChartLegendItem
                color={getSeriesColor("secondary")}
                label="Google Ads"
                value={formatMetric("spend", cT.google_spend)}
              />
              <ChartLegendItem
                color={getSeriesColor("success")}
                label="Conversões"
                value={formatMetric("conversions", cT.conversions)}
              />
            </>
          }
          className="xl:col-span-2"
        >
          {cT.spend === 0 && cT.conversions === 0 ? (
            <EmptyChart />
          ) : (
            <AreaChartLotsLazy
              data={daily}
              yMetric="spend"
              series={[
                { key: "meta_spend", label: "Meta Ads", metric: "spend", tone: "primary" },
                { key: "google_spend", label: "Google Ads", metric: "spend", tone: "secondary" },
                { key: "conversions", label: "Conversões", metric: "conversions", tone: "success" },
              ]}
              height={280}
            />
          )}
        </ChartFrame>

        <ChartFrame
          eyebrow="Distribuição"
          title="Mix de investimento"
          description="Onde o orçamento do portfólio foi alocado."
        >
          {share.length === 0 ? (
            <EmptyMini icon={Compass} text="Sem investimento registrado no período." />
          ) : (
            <DonutChartLots
              slices={share.map((s) => ({
                key: s.platform,
                label: s.label,
                value: s.value,
                tone: s.platform === "meta_ads" ? "primary" : "secondary",
              }))}
              metric="spend"
              centerLabel="Total"
              centerValue={formatMetric("spend", cT.spend)}
            />
          )}
        </ChartFrame>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          eyebrow="Fila"
          title="O que precisa de atenção"
          description="Pendências, sync atrasada e variação de CPA."
          bodyClassName="px-0 py-0"
          className="xl:col-span-2"
        >
          {attentionItems.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              Nenhuma pendência no recorte atual.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {attentionItems.map((item) => {
                const clienteId = idByNome.get(item.cliente);
                const isApproval = item.to === "/admin/aprovacoes";
                return (
                  <li key={item.key}>
                    {isApproval && (item.search?.cliente ?? clienteId) ? (
                      <Link
                        to="/admin/aprovacoes"
                        search={{ cliente: item.search?.cliente ?? clienteId }}
                        className="flex items-center justify-between gap-3 px-5 py-3 text-[13px] transition-colors hover:bg-muted/40"
                      >
                        <span className="truncate font-medium text-foreground">{item.cliente}</span>
                        <span className="shrink-0 text-[12px] text-muted-foreground">
                          {item.reason}
                        </span>
                      </Link>
                    ) : (
                      <Link
                        to="/cliente/$cliente"
                        params={{ cliente: slugify(item.cliente) }}
                        className="flex items-center justify-between gap-3 px-5 py-3 text-[13px] transition-colors hover:bg-muted/40"
                      >
                        <span className="truncate font-medium text-foreground">{item.cliente}</span>
                        <span className="shrink-0 text-[12px] text-muted-foreground">
                          {item.reason}
                        </span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Contas"
          title="Status das contas"
          description="Última atualização recebida por cliente."
          bodyClassName="px-0 py-0"
        >
          {ativos.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Sem dados em <code>base_metricas</code> ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {ativos.slice(0, 8).map((a) => (
                <li key={a.cliente} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/cliente/$cliente"
                      params={{ cliente: slugify(a.cliente) }}
                      className="truncate text-[13px] font-medium text-foreground hover:underline"
                    >
                      {a.cliente}
                    </Link>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relTime(a.ultima_ingestao)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(a.plataformas_ativas ?? []).slice(0, 5).map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        {PLATFORM_LABEL[p as keyof typeof PLATFORM_LABEL] ?? p}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

function AttentionChip({
  to,
  icon: Icon,
  label,
  tone,
}: {
  to: "/admin/aprovacoes" | "/admin/relatorios" | "/admin/conexoes/health";
  icon: typeof Clock;
  label: string;
  tone: "warn" | "ok";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "lots-surface flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-colors hover:bg-muted/50",
        tone === "warn" ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          tone === "warn"
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        {tone === "warn" ? <AlertTriangle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      {label}
    </Link>
  );
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `há ${days}d`;
  return d.toLocaleDateString("pt-BR");
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
        <Sparkles className="h-4 w-4" />
      </div>
      <p className="font-display text-sm font-semibold">Sem registros no período</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Quando as campanhas começarem a rodar, a evolução aparece aqui.
      </p>
    </div>
  );
}

function EmptyMini({ icon: Icon, text }: { icon: typeof Sparkles; text: string }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[12.5px] text-muted-foreground">{text}</p>
    </div>
  );
}
