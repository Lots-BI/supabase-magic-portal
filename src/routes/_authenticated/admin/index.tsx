import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { listClientes, listServicos } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lots/PageHeader";
import { StatCard } from "@/components/lots/StatCard";
import { SectionCard } from "@/components/lots/SectionCard";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { DeltaPill } from "@/components/lots/DeltaPill";
import { ChartFrame, ChartLegendItem } from "@/components/lots/charts/ChartFrame";
import { getSeriesColor } from "@/components/lots/charts/chart-colors";
import { BarChartLots } from "@/components/lots/charts/BarChartLots";
import { DonutChartLots } from "@/components/lots/charts/DonutChartLots";
import { AreaChartLotsLazy } from "@/components/lots/charts/AreaChartLotsLazy";
import { adminTitle, BRAND_NAME } from "@/lib/brand";
import {
  PLATFORM_LABEL,
  aggregateByCliente,
  dailyFromOverview,
  deriveCpa,
  deriveCtr,
  formatMetric,
  pctDelta,
  periodRange,
  spendShareByPlatform,
  sumOverview,
  METRIC_META,
  OVERVIEW_CLIENTE_SELECT,
  type OverviewRow,
} from "@/lib/metrics";
import { slugify } from "@/lib/slug";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import {
  Users,
  UserCheck,
  Briefcase,
  ArrowUpRight,
  RadioTower,
  DollarSign,
  Eye,
  Activity,
  Target,
  Compass,
  Sparkles,
} from "lucide-react";

// ---------------- Types & queries ----------------

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

const servicosQuery = queryOptions({
  queryKey: ["admin", "servicos"],
  queryFn: () => listServicos(),
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

// ---------------- Route ----------------

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: adminTitle("Centro executivo") }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesAdminQuery);
    void context.queryClient.ensureQueryData(servicosQuery);
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
        eyebrow="Painel administrativo"
        title="Centro executivo"
        description={`Visão consolidada da operação ${BRAND_NAME} — investimento, performance e portfólio.`}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <PeriodToggle value={days} onChange={setDays} />
            <Link
              to="/admin/clientes/novo"
              className="lots-focus inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-px sm:h-9 sm:w-auto"
            >
              Novo cliente
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      <Suspense fallback={<DashboardSkeleton kpiCount={6} />}>
        <ExecutiveBody days={days} />
      </Suspense>
    </div>
  );
}

function ExecutiveBody({ days }: { days: PeriodDays }) {
  const { data: clientes } = useSuspenseQuery(clientesAdminQuery);
  const { data: servicos } = useSuspenseQuery(servicosQuery);
  const { data: ativos } = useSuspenseQuery(clientesAtivosQuery);
  const { data: overview } = useSuspenseQuery(overviewAdminQuery(days));

  const period = useMemo(() => periodRange(days), [days]);
  const current = overview.filter((r) => r.data >= period.from && r.data <= period.to);
  const previous = overview.filter((r) => r.data >= period.prevFrom && r.data <= period.prevTo);
  const cT = sumOverview(current);
  const pT = sumOverview(previous);

  const daily = dailyFromOverview(current, period);
  const share = spendShareByPlatform(current);
  const ctr = deriveCtr(cT.impressions, cT.clicks);
  const cpa = deriveCpa(cT.spend, cT.conversions);

  const ativosCount = clientes.filter((c: any) => c.ativo).length;
  const servicosCount = servicos.filter((s: any) => s.ativo).length;
  const totalAcessos = clientes.reduce((sum: number, c: any) => sum + (c.qtd_acessos ?? 0), 0);
  const ultimaSync = ativos
    .map((a) => a.ultima_ingestao)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  const topClientes = aggregateByCliente(current)
    .sort((a, b) => b.totals.spend - a.totals.spend)
    .slice(0, 6);

  return (
    <div className="space-y-7">
      {/* HERO KPIs */}
      <section className="grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Investimento total"
          value={formatMetric("spend", cT.spend)}
          icon={DollarSign}
          emphasis="hero"
          delta={pctDelta(cT.spend, pT.spend)}
          description={METRIC_META.spend.description}
          hint={`Meta ${formatMetric("spend", cT.meta_spend)} · Google ${formatMetric("spend", cT.google_spend)}`}
          className="lg:col-span-2"
        />
        <StatCard
          label="Clientes ativos"
          value={ativosCount}
          icon={UserCheck}
          hint={`${clientes.length} no total`}
          description="Contas com dados recebidos recentemente nas integrações."
        />
        <StatCard
          label="Alcance Instagram"
          value={formatMetric("reach", cT.reach)}
          icon={Eye}
          delta={pctDelta(cT.reach, pT.reach)}
          description={METRIC_META.reach.description}
        />
        <StatCard
          label="Sessões GA4"
          value={formatMetric("sessions", cT.sessions)}
          icon={Activity}
          delta={pctDelta(cT.sessions, pT.sessions)}
          description={METRIC_META.sessions.description}
        />
        <StatCard
          label="Conversões"
          value={formatMetric("conversions", cT.conversions)}
          icon={Target}
          delta={pctDelta(cT.conversions, pT.conversions)}
          description={METRIC_META.conversions.description}
          hint={cpa > 0 ? `CPA ${formatMetric("spend", cpa)}` : undefined}
        />
      </section>

      {/* SECUNDÁRIOS — operacional */}
      <section className="grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Serviços ativos"
          value={servicosCount}
          icon={Briefcase}
          emphasis="compact"
        />
        <StatCard label="Acessos vinculados" value={totalAcessos} icon={Users} emphasis="compact" />
        <StatCard
          label="Última sync"
          value={relTime(ultimaSync ?? null)}
          icon={RadioTower}
          emphasis="compact"
        />
        <StatCard
          label="CTR consolidado"
          value={cT.impressions > 0 ? `${ctr.toFixed(2)}%` : "—"}
          icon={Sparkles}
          emphasis="compact"
          description={METRIC_META.ctr.description}
        />
      </section>

      {/* EVOLUÇÃO + DISTRIBUIÇÃO */}
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

      {/* TOP CLIENTES + INGESTÃO */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartFrame
          eyebrow="Top clientes"
          title={`Maior investimento · ${days} dias`}
          description="Ordenado por orçamento de mídia executado."
          className="xl:col-span-2"
        >
          <BarChartLots
            rows={topClientes.map((c, idx) => ({
              key: c.cliente,
              label: (
                <Link
                  to="/cliente/$cliente"
                  params={{ cliente: slugify(c.cliente) }}
                  className="hover:underline"
                >
                  {c.cliente}
                </Link>
              ),
              value: c.totals.spend,
              metric: "spend",
              tone: idx === 0 ? "primary" : "secondary",
              trailing:
                c.totals.conversions > 0
                  ? `${formatMetric("conversions", c.totals.conversions)} conv.`
                  : undefined,
            }))}
            empty="Nenhum cliente com investimento no período."
          />
        </ChartFrame>

        <SectionCard
          eyebrow="Ingestão"
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
              {ativos.slice(0, 6).map((a) => (
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

// ---------------- Helpers ----------------

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
