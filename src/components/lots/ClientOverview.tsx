import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DollarSign, Percent, Sparkles, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lots/PageHeader";
import { StatCard } from "@/components/lots/StatCard";
import { OverviewSlotCard } from "@/components/lots/OverviewSlotCard";
import { PeriodToggle, type PeriodDays } from "@/components/lots/PeriodToggle";
import { DeltaPill } from "@/components/lots/DeltaPill";
import { ChartFrame, ChartLegendItem } from "@/components/lots/charts/ChartFrame";
import { getSeriesColor } from "@/components/lots/charts/chart-colors";
import { DonutChartLots } from "@/components/lots/charts/DonutChartLots";
import { AreaChartLotsLazy } from "@/components/lots/charts/AreaChartLotsLazy";
import { PlatformBrandMark } from "@/components/lots/PlatformBrandMark";
import { catalogForPlatforms } from "@/lib/dashboards-catalog";
import {
  METRIC_META,
  dailyFromOverview,
  deriveCpa,
  deriveCtr,
  formatMetric,
  pctDelta,
  periodRange,
  spendShareByPlatform,
  sumOverview,
  type OverviewRow,
} from "@/lib/metrics";

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapOverview(row: Record<string, unknown>): OverviewRow {
  return {
    data: String(row.data).slice(0, 10),
    cliente: String(row.cliente),
    meta_spend: asNumber(row.meta_spend),
    google_spend: asNumber(row.google_spend),
    total_impressions: asNumber(row.total_impressions),
    total_clicks: asNumber(row.total_clicks),
    ga4_sessions: asNumber(row.ga4_sessions),
    ga4_conversions: asNumber(row.ga4_conversions),
    instagram_reach: asNumber(row.instagram_reach),
    instagram_interactions: asNumber(row.instagram_interactions),
    meta_results: asNumber(row.meta_results),
    meta_conversions: asNumber(row.meta_conversions),
    google_conversions: asNumber(row.google_conversions),
    meta_messaging_conversations_started: asNumber(row.meta_messaging_conversations_started),
    instagram_followers_count: asNumber(row.instagram_followers_count),
  };
}

export function clientOverviewQuery(cliente: string, days: PeriodDays) {
  const period = periodRange(days);
  return queryOptions({
    queryKey: ["client-overview", cliente, days] as const,
    queryFn: async (): Promise<OverviewRow[]> => {
      const { data, error } = await supabase.rpc("client_overview", {
        p_cliente: cliente,
        p_from: period.prevFrom,
        p_to: period.to,
      });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapOverview(row as Record<string, unknown>));
    },
    staleTime: 30_000,
  });
}

export function ClientOverview({
  nome,
  slug,
  queryName,
  platforms,
}: {
  nome: string;
  slug: string;
  queryName: string;
  platforms: string[];
}) {
  const [days, setDays] = useState<PeriodDays>(30);
  const { data: overview } = useSuspenseQuery(clientOverviewQuery(queryName, days));
  const period = useMemo(() => periodRange(days), [days]);
  const current = overview.filter((row) => row.data >= period.from && row.data <= period.to);
  const previous = overview.filter((row) => row.data >= period.prevFrom && row.data <= period.prevTo);
  const cT = sumOverview(current);
  const pT = sumOverview(previous);
  const daily = dailyFromOverview(current, period);
  const share = spendShareByPlatform(current);
  const ctr = deriveCtr(cT.impressions, cT.clicks);
  const prevCtr = deriveCtr(pT.impressions, pT.clicks);
  const cpa = deriveCpa(cT.spend, cT.conversions);
  const catalog = catalogForPlatforms(platforms);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={nome}
        title="Visão geral"
        description="Investimento, resultado e atalhos dos dashboards só desta conta."
        actions={<PeriodToggle value={days} onChange={setDays} />}
      />

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
          label="Resultados"
          value={formatMetric("conversions", cT.conversions)}
          icon={Target}
          delta={pctDelta(cT.conversions, pT.conversions)}
          description="Métrica que as campanhas usam para otimizar a entrega de usuários."
          hint={
            cpa > 0
              ? `CPA ${formatMetric("spend", cpa)} · resultados Meta + GA4`
              : "Resultados Meta + conversões GA4"
          }
        />
        <OverviewSlotCard current={current} previous={previous} scope={slug} />
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
          title="Investimento diário"
          description="Soma diária de Meta Ads e Google Ads nesta conta."
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
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="font-display text-sm font-semibold">Sem registros no período</p>
            </div>
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
          description="Onde o orçamento desta conta foi alocado."
        >
          {share.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-muted-foreground">
              Sem investimento registrado no período.
            </p>
          ) : (
            <DonutChartLots
              slices={share.map((slice) => ({
                key: slice.platform,
                label: slice.label,
                value: slice.value,
                tone: slice.platform === "meta_ads" ? "primary" : "secondary",
              }))}
              metric="spend"
              centerLabel="Total"
              centerValue={formatMetric("spend", cT.spend)}
            />
          )}
        </ChartFrame>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-semibold text-foreground">Dashboards</h2>
        {catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma plataforma conectada ainda. As métricas aparecem aqui depois da primeira coleta.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={entry.to}
                  params={{ cliente: slug }}
                  className="lots-surface flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <PlatformBrandMark dashboardId={entry.id} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {entry.label}
                    </span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {entry.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
