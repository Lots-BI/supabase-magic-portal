// ============================================================================
// Lotus · PlatformDashboard
// Componente GENÉRICO. Renderiza o dashboard completo de QUALQUER plataforma
// descrita por um PlatformDef. Faz UMA query a def.view cobrindo [prevFrom, to]
// — assim cards, KPIs, charts, tabela, ranking e insights vivem do mesmo
// dataset. Nada de cálculos no componente: tudo passa pelo engine.
// ============================================================================

import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import { Inbox, Sparkles, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformDef, ValueFormat } from "@/lib/platforms/types";
import type { CommonMetric } from "@/lib/metrics";
import { METRIC_META, resolveMetricDescription } from "@/lib/metrics";
import { aggregatePeriod, pctDelta, platformViewSelect } from "@/lib/platforms/engine";
import type { Period } from "@/lib/period";
import { formatBR } from "@/lib/period";
import { SectionCard } from "./SectionCard";
import { StatCard } from "./StatCard";
import { ChartFrame, ChartLegendItem } from "./charts/ChartFrame";
import { AreaChartLotusLazy } from "./charts/AreaChartLotusLazy";
import { getSeriesColor } from "./charts/chart-colors";
import { DeltaPill } from "./DeltaPill";
import { EmptyState } from "./EmptyState";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { cn } from "@/lib/utils";

// ---------- Formatadores (locais para evitar coupling com metrics.ts) -------

const _int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const _dec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const _brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const _brlC = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

function formatValue(format: ValueFormat, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (format) {
    case "currency":
      return Math.abs(value) < 100 ? _brlC.format(value) : _brl.format(value);
    case "percent":
      return `${value.toFixed(2)}%`;
    case "decimal":
      return _dec.format(value);
    case "int":
    default:
      return _int.format(Math.round(value));
  }
}

/** Mapeia métrica da plataforma para formatação do gráfico (tooltip/eixo). */
function metricToChartCommon(metricKey: string, format: ValueFormat): CommonMetric {
  if (format === "currency") return "spend";
  if (format === "percent") return "ctr";
  if (metricKey.includes("reach") || metricKey.includes("engaged") || metricKey.includes("users"))
    return "reach";
  if (metricKey.includes("session")) return "sessions";
  if (metricKey.includes("conversion")) return "conversions";
  if (metricKey.includes("click")) return "clicks";
  if (metricKey.includes("engagement") || metricKey.includes("interaction")) return "engagement";
  return "impressions";
}

// ---------- Query -----------------------------------------------------------

const platformRowsQuery = (def: PlatformDef, cliente: string, prevFrom: string, to: string) =>
  queryOptions({
    queryKey: ["platform-rows", def.key, cliente, prevFrom, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(def.view)
        .select(platformViewSelect(def))
        .eq("cliente", cliente)
        .gte("data", prevFrom)
        .lte("data", to)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown> & { data: string; cliente: string }>;
    },
  });

// ---------- Componente principal -------------------------------------------

interface Props {
  def: PlatformDef;
  cliente: string;
  period: Period;
}

export function PlatformDashboard({ def, cliente, period }: Props) {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <PlatformDashboardBody def={def} cliente={cliente} period={period} />
    </Suspense>
  );
}

function PlatformDashboardBody({ def, cliente, period }: Props) {
  const { data: rows } = useSuspenseQuery(
    platformRowsQuery(def, cliente, period.prevFrom, period.to),
  );

  const agg = useMemo(() => aggregatePeriod(def, rows, period), [def, rows, period]);
  const hasData = rows.some((r) => r.data >= period.from && r.data <= period.to);

  return (
    <div className="relative isolate space-y-6 sm:space-y-7">
      {!hasData ? (
        <SectionCard eyebrow="Sem dados" title="Nada para mostrar no período selecionado">
          <EmptyState
            icon={Inbox}
            title="Sem dados no período"
            description="Ajuste o período ou aguarde a próxima sincronização. Quando a integração registrar novos dados, eles aparecem aqui automaticamente."
            compact
          />
        </SectionCard>
      ) : (
        <>
          <HeroCards def={def} agg={agg} />
          <KpiCards def={def} agg={agg} />
          <ChartsSection def={def} agg={agg} />
          <ComparisonBlock def={def} agg={agg} period={period} />
          {def.campaignField && <CampaignRanking def={def} agg={agg} />}
          <DailyTable def={def} agg={agg} period={period} />
          <InsightsBlock def={def} agg={agg} period={period} />
        </>
      )}
    </div>
  );
}

// ---------- Cards ----------------------------------------------------------

function metricDescription(key: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const common = key as CommonMetric;
  if (common in METRIC_META) return METRIC_META[common as CommonMetric].description;
  return resolveMetricDescription(key);
}

function HeroCards({ def, agg }: { def: PlatformDef; agg: ReturnType<typeof aggregatePeriod> }) {
  const heroes = def.metrics.filter((m) => def.heroMetrics.includes(m.key));
  return (
    <section className="relative isolate grid grid-cols-2 gap-3 lg:grid-cols-4">
      {heroes.map((m, i) => {
        const cur = agg.current[m.key] ?? 0;
        const prev = agg.previous[m.key] ?? 0;
        return (
          <StatCard
            key={m.key}
            label={m.label}
            value={formatValue(m.format, cur)}
            icon={m.icon}
            delta={pctDelta(cur, prev)}
            positiveIsGood={m.positiveIsGood ?? true}
            emphasis={i === 0 ? "hero" : "default"}
            description={metricDescription(m.key, m.description)}
            className={i === 0 ? "lg:col-span-2" : undefined}
          />
        );
      })}
    </section>
  );
}

function KpiCards({ def, agg }: { def: PlatformDef; agg: ReturnType<typeof aggregatePeriod> }) {
  if (def.kpis.length === 0) return null;
  return (
    <section className="relative isolate grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
      {def.kpis.map((k) => {
        const cur = agg.currentKpis[k.key] ?? 0;
        const prev = agg.previousKpis[k.key] ?? 0;
        return (
          <StatCard
            key={k.key}
            label={k.label}
            value={formatValue(k.format, cur)}
            icon={k.icon}
            delta={pctDelta(cur, prev)}
            positiveIsGood={k.positiveIsGood}
            emphasis="compact"
            description={metricDescription(k.key, k.description)}
          />
        );
      })}
    </section>
  );
}

// ---------- Charts ---------------------------------------------------------

function ChartsSection({
  def,
  agg,
}: {
  def: PlatformDef;
  agg: ReturnType<typeof aggregatePeriod>;
}) {
  return (
    <section className="relative isolate grid grid-cols-1 gap-5 xl:grid-cols-2">
      {def.charts.map((chart) => {
        const yMetricDef = def.metrics.find((m) => m.key === chart.yMetric);
        const yChartMetric = yMetricDef
          ? metricToChartCommon(yMetricDef.key, yMetricDef.format)
          : "impressions";
        const headlineVal = yMetricDef ? (agg.current[chart.yMetric] ?? 0) : 0;
        return (
          <ChartFrame
            key={chart.key}
            eyebrow="Evolução"
            title={chart.title}
            description={chart.description}
            headline={yMetricDef ? formatValue(yMetricDef.format, headlineVal) : undefined}
            legend={
              <>
                {chart.series.map((s) => {
                  const m = def.metrics.find((mm) => mm.key === s.metric);
                  return (
                    <ChartLegendItem
                      key={s.metric}
                      color={getSeriesColor(s.tone === "neutral" ? "neutral" : s.tone)}
                      label={s.label}
                      value={m ? formatValue(m.format, agg.current[s.metric] ?? 0) : undefined}
                    />
                  );
                })}
              </>
            }
          >
            <AreaChartLotusLazy
              data={agg.daily}
              yMetric={yChartMetric}
              height={chart.height ?? 260}
              series={chart.series.map((s) => {
                const m = def.metrics.find((mm) => mm.key === s.metric);
                const chartMetric = m ? metricToChartCommon(m.key, m.format) : yChartMetric;
                return {
                  key: s.metric,
                  label: s.label,
                  metric: chartMetric,
                  tone: s.tone,
                };
              })}
            />
          </ChartFrame>
        );
      })}
    </section>
  );
}

// ---------- Comparativo período atual × anterior ---------------------------

function ComparisonBlock({
  def,
  agg,
  period,
}: {
  def: PlatformDef;
  agg: ReturnType<typeof aggregatePeriod>;
  period: Period;
}) {
  const rows = [
    ...def.metrics,
    ...def.kpis.map((k) => ({
      key: k.key,
      label: k.label,
      format: k.format,
      positiveIsGood: k.positiveIsGood,
    })),
  ];
  return (
    <SectionCard
      eyebrow="Comparativo"
      title="Período atual × anterior"
      description={`${formatBR(period.from)}–${formatBR(period.to)} comparado a ${formatBR(period.prevFrom)}–${formatBR(period.prevTo)}.`}
      bodyClassName="px-0 py-0"
    >
      <div className="lotus-table-scroll">
        <table className="w-full min-w-max text-[13px]">
          <thead className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Métrica</th>
              <th className="lotus-table-head-sticky px-4 py-2.5 text-right font-medium">Atual</th>
              <th className="lotus-table-head-sticky px-4 py-2.5 text-right font-medium">
                Anterior
              </th>
              <th className="lotus-table-head-sticky px-4 py-2.5 text-right font-medium">
                Variação
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cur = agg.current[row.key] ?? agg.currentKpis[row.key] ?? 0;
              const prev = agg.previous[row.key] ?? agg.previousKpis[row.key] ?? 0;
              const positiveIsGood = (row as { positiveIsGood?: boolean }).positiveIsGood ?? true;
              return (
                <tr key={row.key} className="border-t border-border/50 hover:bg-muted/10">
                  <td className="px-4 py-2.5 text-foreground">{row.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                    {formatValue(row.format, cur)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {formatValue(row.format, prev)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DeltaPill delta={pctDelta(cur, prev)} positiveIsGood={positiveIsGood} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------- Ranking de campanhas -------------------------------------------

function CampaignRanking({
  def,
  agg,
}: {
  def: PlatformDef;
  agg: ReturnType<typeof aggregatePeriod>;
}) {
  if (agg.campaigns.length === 0) return null;
  // Ordenação default: por primeira métrica hero (geralmente spend).
  const sortKey = def.heroMetrics[0];
  const ranked = [...agg.campaigns].sort(
    (a, b) => (b.totals[sortKey] ?? 0) - (a.totals[sortKey] ?? 0),
  );
  const cols = def.metrics.filter((m) => def.heroMetrics.includes(m.key));
  const kpiCols = def.kpis.slice(0, 3);
  return (
    <SectionCard
      eyebrow="Campanhas"
      title="Ranking por desempenho"
      description={`${ranked.length} ${ranked.length === 1 ? "campanha ativa" : "campanhas ativas"} no período, ordenadas por ${def.metrics.find((m) => m.key === sortKey)?.label ?? sortKey}.`}
      bodyClassName="px-0 py-0"
    >
      <div className="lotus-table-scroll">
        <table className="w-full min-w-max text-[13px]">
          <thead className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">#</th>
              <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Campanha</th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="lotus-table-head-sticky px-4 py-2.5 text-right font-medium"
                >
                  {c.label}
                </th>
              ))}
              {kpiCols.map((k) => (
                <th key={k.key} className="px-4 py-2.5 text-right font-medium">
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((c, i) => (
              <tr key={c.campanha} className="border-t border-border/50 hover:bg-muted/10">
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                      i === 0
                        ? "bg-primary/15 text-primary-700 dark:text-primary-200"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i === 0 ? <Trophy className="h-3 w-3" /> : i + 1}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-medium text-foreground">{c.campanha}</td>
                {cols.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-right tabular-nums text-foreground">
                    {formatValue(col.format, c.totals[col.key] ?? 0)}
                  </td>
                ))}
                {kpiCols.map((k) => (
                  <td
                    key={k.key}
                    className="px-4 py-2.5 text-right tabular-nums text-muted-foreground"
                  >
                    {formatValue(k.format, c.kpis[k.key] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------- Tabela diária --------------------------------------------------

function DailyTable({
  def,
  agg,
  period,
}: {
  def: PlatformDef;
  agg: ReturnType<typeof aggregatePeriod>;
  period: Period;
}) {
  // Ordem mais recente primeiro.
  const rows = [...agg.daily].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <SectionCard
      eyebrow="Detalhamento"
      title="Tabela diária"
      description={`Uma linha por dia entre ${formatBR(period.from)} e ${formatBR(period.to)}.`}
      bodyClassName="px-0 py-0"
    >
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0 bg-card text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Dia</th>
              {def.metrics.map((m) => (
                <th key={m.key} className="px-4 py-2.5 text-right font-medium">
                  {m.short ?? m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date as string} className="border-t border-border/50 hover:bg-muted/10">
                <td className="whitespace-nowrap px-4 py-2 tabular-nums text-foreground">
                  {formatBR(r.date as string)}
                </td>
                {def.metrics.map((m) => (
                  <td
                    key={m.key}
                    className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-foreground"
                  >
                    {formatValue(m.format, r[m.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------- Insights automáticos -------------------------------------------

function InsightsBlock({
  def,
  agg,
  period,
}: {
  def: PlatformDef;
  agg: ReturnType<typeof aggregatePeriod>;
  period: Period;
}) {
  const insights: Array<{
    id: string;
    title: string;
    detail: string;
    tone: "positive" | "negative" | "neutral";
  }> = [];

  // Regras baseadas em variações significativas dos KPIs declarados.
  for (const k of def.kpis) {
    const cur = agg.currentKpis[k.key] ?? 0;
    const prev = agg.previousKpis[k.key] ?? 0;
    const d = pctDelta(cur, prev);
    if (d == null || Math.abs(d) < 8) continue;
    const up = d > 0;
    const good = up === k.positiveIsGood;
    insights.push({
      id: `kpi-${k.key}`,
      title: `${k.label} ${up ? "subiu" : "caiu"} ${Math.abs(d).toFixed(1)}% vs período anterior`,
      detail: `Atual ${formatValue(k.format, cur)} · anterior ${formatValue(k.format, prev)}.`,
      tone: good ? "positive" : "negative",
    });
  }

  // Variação das métricas hero.
  for (const key of def.heroMetrics) {
    const m = def.metrics.find((mm) => mm.key === key);
    if (!m) continue;
    const cur = agg.current[key] ?? 0;
    const prev = agg.previous[key] ?? 0;
    const d = pctDelta(cur, prev);
    if (d == null || Math.abs(d) < 10) continue;
    const up = d > 0;
    const good = up === (m.positiveIsGood ?? true);
    insights.push({
      id: `metric-${key}`,
      title: `${m.label} ${up ? "aumentou" : "diminuiu"} ${Math.abs(d).toFixed(1)}%`,
      detail: `Atual ${formatValue(m.format, cur)} · anterior ${formatValue(m.format, prev)}.`,
      tone: good ? "positive" : "negative",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "stable",
      title: "Período estável",
      detail: `Nenhuma variação relevante (> 8% nos KPIs / > 10% nas métricas principais) entre ${formatBR(period.from)}–${formatBR(period.to)} e o período anterior.`,
      tone: "neutral",
    });
  }

  return (
    <SectionCard
      eyebrow="Insights"
      title="Leitura automática do período"
      description="Sinais derivados diretamente dos seus dados — sem invenção."
    >
      <ul className="space-y-3">
        {insights.slice(0, 6).map((i) => (
          <li
            key={i.id}
            className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
          >
            <span
              className={cn(
                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
                i.tone === "positive" && "bg-success/12 text-[color:var(--success)]",
                i.tone === "negative" && "bg-danger/12 text-[color:var(--danger)]",
                i.tone === "neutral" && "bg-primary/10 text-primary-600 dark:text-primary-300",
              )}
            >
              {i.tone === "positive" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : i.tone === "negative" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">{i.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
