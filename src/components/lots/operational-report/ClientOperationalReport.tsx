import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/lots/PageHeader";
import { PeriodPicker } from "@/components/lots/PeriodPicker";
import { AreaChartLotsLazy } from "@/components/lots/charts/AreaChartLotsLazy";
import { BarChartLots } from "@/components/lots/charts/BarChartLots";
import { DonutChartLots } from "@/components/lots/charts/DonutChartLots";
import { DashboardSkeleton } from "@/components/lots/DashboardSkeleton";
import { DeltaPill } from "@/components/lots/DeltaPill";
import {
  PlatformBrandMark,
  dashboardBrandTheme,
} from "@/components/lots/PlatformBrandMark";
import { cn } from "@/lib/utils";
import { formatBR, resolvePeriod, type PeriodInput, type PeriodPreset } from "@/lib/period";
import type { CommonMetric } from "@/lib/metrics";
import type { ValueFormat } from "@/lib/platforms/types";
import { getClientOperationalReportFn } from "@/modules/operational-report/operational-report.server";
import { formatReportValue } from "@/modules/operational-report/format";
import type {
  OperationalReport,
  ReportCallout,
  ReportMetric,
  ReportMood,
  ReportPlatformSection,
} from "@/modules/operational-report/types";

export function ClientOperationalReport({
  cadastroClienteId,
  clienteNome,
  initialPreset = "last_30",
}: {
  cadastroClienteId: number;
  clienteNome: string;
  clienteSlug: string;
  initialPreset?: PeriodPreset;
}) {
  const [periodInput, setPeriodInput] = useState<PeriodInput>({ preset: initialPreset });
  const period = useMemo(() => resolvePeriod(periodInput), [periodInput]);

  const query = useQuery({
    queryKey: [
      "operational-report",
      cadastroClienteId,
      periodInput.preset,
      periodInput.customFrom ?? null,
      periodInput.customTo ?? null,
    ],
    queryFn: () =>
      getClientOperationalReportFn({
        data: {
          cadastroClienteId,
          preset: periodInput.preset,
          customFrom: periodInput.customFrom,
          customTo: periodInput.customTo,
        },
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatório"
        title={clienteNome}
        description="O que aconteceu neste recorte — só os números principais."
        actions={<PeriodPicker value={periodInput} onChange={setPeriodInput} />}
      />

      {query.isLoading ? (
        <DashboardSkeleton kpiCount={4} />
      ) : query.isError ? (
        <div className="lots-surface p-5 text-sm text-danger">
          {query.error instanceof Error ? query.error.message : "Não foi possível montar o relatório."}
        </div>
      ) : query.data ? (
        <ReportCanvas report={query.data} />
      ) : null}
    </div>
  );
}

function ReportCanvas({ report }: { report: OperationalReport }) {
  const empty =
    report.heroes.length === 0 &&
    report.platforms.length === 0 &&
    !report.posts &&
    !report.content;
  const campaigns = report.platforms.flatMap((platform) =>
    platform.campaigns.map((campaign) => ({ ...campaign, platform: platform.label })),
  );
  const showMix = report.mix.length >= 2;
  const showCampaigns = !showMix && campaigns.length > 0;
  const showPulseRow = Boolean(report.pulse) || showMix || showCampaigns;

  return (
    <div className="space-y-4 sm:space-y-5">
      <Poster report={report} />

      {empty ? (
        <section className="lots-surface px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">Nada coletado neste recorte</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando a plataforma estiver ativa, ela aparece aqui sozinha.
          </p>
        </section>
      ) : null}

      {report.heroes.length > 0 && (
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {report.heroes.map((hero, index) => (
            <HeroTile key={hero.key} hero={hero} featured={index === 0} />
          ))}
        </section>
      )}

      {showPulseRow && (
        <section
          className={cn(
            "grid gap-3",
            (showMix || showCampaigns) && report.pulse ? "lg:grid-cols-5" : "grid-cols-1",
          )}
        >
          {report.pulse && (
            <article
              className={cn(
                "lots-surface lots-petal-accent p-5 sm:p-6",
                showMix || showCampaigns ? "lg:col-span-3" : "lg:col-span-1",
              )}
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600">
                Pulso do período
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold">{report.pulse.label}</h3>
              <div className="mt-3">
                <AreaChartLotsLazy
                  data={report.pulse.daily}
                  height={220}
                  yMetric={chartMetric(report.pulse.format)}
                  series={[
                    {
                      key: "value",
                      label: report.pulse.label,
                      metric: chartMetric(report.pulse.format),
                      tone: "primary",
                    },
                  ]}
                />
              </div>
            </article>
          )}

          {(showMix || showCampaigns) && (
            <article className="lots-surface p-5 sm:p-6 lg:col-span-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600">
                Onde foi
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold">
                {showMix ? "Investimento por plataforma" : "Campanhas"}
              </h3>
              <div className="mt-4">
                {showMix ? (
                  <DonutChartLots
                    metric="spend"
                    size={168}
                    thickness={20}
                    centerLabel="Total"
                    centerValue={formatReportValue(
                      "currency",
                      report.mix.reduce((sum, slice) => sum + slice.value, 0),
                    )}
                    slices={report.mix.map((slice, index) => ({
                      key: slice.key,
                      label: slice.label,
                      value: slice.value,
                      tone: index === 0 ? "primary" : index === 1 ? "secondary" : "accent",
                    }))}
                  />
                ) : (
                  <BarChartLots
                    rows={campaigns.slice(0, 3).map((campaign) => ({
                      key: campaign.name,
                      label: campaign.name,
                      value: campaign.spend,
                      metric: "spend" as const,
                      trailing:
                        campaign.results != null
                          ? `${formatReportValue("int", campaign.results)} res.`
                          : undefined,
                    }))}
                  />
                )}
              </div>
            </article>
          )}
        </section>
      )}

      {report.movers.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3">
          {report.movers.map((mover) => (
            <MoverTile key={mover.id} mover={mover} />
          ))}
        </section>
      )}

      {report.platforms.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {report.platforms.map((platform) => (
            <PlatformTile key={platform.key} platform={platform} slug={report.clienteSlug} />
          ))}
        </section>
      )}

      {(report.posts || report.content) && (
        <section className={cn("grid gap-3", report.posts && report.content && "lg:grid-cols-2")}>
          {report.posts && <PostsCanvas posts={report.posts} slug={report.clienteSlug} />}
          {report.content && <ContentCanvas content={report.content} slug={report.clienteSlug} />}
        </section>
      )}
    </div>
  );
}

function Poster({ report }: { report: OperationalReport }) {
  return (
    <section className="lots-surface lots-petal-accent relative isolate overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
      <span
        className="pointer-events-none absolute -right-4 -bottom-8 select-none font-display text-[7.5rem] font-semibold leading-none text-primary/10 sm:text-[9rem]"
        aria-hidden
      >
        {report.period.days}
      </span>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary-600">
        O que aconteceu · {report.period.label}
      </p>
      <h2 className="relative mt-3 max-w-3xl font-display text-[1.65rem] font-semibold leading-[1.15] tracking-tight sm:text-4xl">
        {report.reading.headline}
      </h2>
      <div className="relative mt-5 flex flex-wrap items-center gap-2">
        <MoodPill mood={report.reading.mood} label={report.reading.moodLabel} />
        <span className="text-xs text-muted-foreground">
          vs {formatBR(report.period.prevFrom)} – {formatBR(report.period.prevTo)}
        </span>
      </div>
    </section>
  );
}

function MoodPill({ mood, label }: { mood: ReportMood; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        mood === "up" && "bg-success/12 text-[color:var(--success)]",
        mood === "down" && "bg-danger/12 text-[color:var(--danger)]",
        mood === "steady" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function HeroTile({ hero, featured }: { hero: ReportMetric; featured: boolean }) {
  return (
    <article
      className={cn(
        "lots-surface flex min-h-[10.5rem] flex-col p-4 sm:min-h-[11.5rem] sm:p-5",
        featured && "lots-petal-accent",
      )}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {hero.label}
      </p>
      <p className="mt-3 font-display text-[1.7rem] font-semibold tabular-nums leading-none tracking-tight sm:text-3xl">
        {formatReportValue(hero.format, hero.value)}
      </p>
      <div className="mt-3">
        <DeltaPill delta={hero.deltaPct} positiveIsGood={hero.positiveIsGood} size="md" />
      </div>
      <CompareTrack current={hero.value} previous={hero.previous} className="mt-auto pt-4" />
    </article>
  );
}

function MoverTile({ mover }: { mover: ReportCallout }) {
  return (
    <article className="lots-surface flex min-h-[7.5rem] flex-col justify-between p-4 sm:p-5">
      <p className="text-[11px] font-medium text-muted-foreground">{mover.detail}</p>
      <div>
        <p className="font-display text-lg font-semibold leading-tight">{mover.title}</p>
        <p
          className={cn(
            "mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight",
            mover.tone === "positive" && "text-[color:var(--success)]",
            mover.tone === "negative" && "text-[color:var(--danger)]",
          )}
        >
          {mover.deltaPct > 0 ? "+" : "−"}
          {Math.abs(mover.deltaPct).toFixed(0)}%
        </p>
      </div>
    </article>
  );
}

const PLATFORM_TO = {
  meta_ads: "/cliente/$cliente/meta-ads",
  google_ads: "/cliente/$cliente/google-ads",
  instagram: "/cliente/$cliente/instagram",
  ga4: "/cliente/$cliente/ga4",
  google_business: "/cliente/$cliente/google-business",
} as const;

function PlatformTile({
  platform,
  slug,
}: {
  platform: ReportPlatformSection;
  slug: string;
}) {
  const theme = dashboardBrandTheme(platform.key);
  const to = PLATFORM_TO[platform.key as keyof typeof PLATFORM_TO] ?? "/cliente/$cliente/instagram";
  const spark = sparkValues(platform);

  return (
    <Link
      to={to}
      params={{ cliente: slug }}
      className={cn(
        "lots-surface lots-focus group relative isolate flex min-h-[16rem] flex-col overflow-hidden p-5",
        theme.card,
      )}
    >
      <PlatformBrandMark
        dashboardId={platform.key}
        className={cn(
          "pointer-events-none absolute -right-3 -bottom-5 h-28 w-28 opacity-[0.16]",
          theme.watermark,
        )}
      />
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <span
          className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", theme.markWrap)}
          aria-hidden
        >
          <PlatformBrandMark dashboardId={platform.key} className="h-6 w-6" />
        </span>
        <ArrowUpRight className={cn("h-5 w-5 shrink-0 opacity-80", theme.arrow)} />
      </div>
      <h3 className={cn("relative z-[1] mt-4 font-display text-xl font-semibold", theme.title)}>
        {platform.label}
      </h3>
      <ul className="relative z-[1] mt-4 space-y-2.5">
        {platform.metrics.map((metric) => (
          <li key={metric.key} className="flex items-baseline justify-between gap-3">
            <span className={cn("text-[12px] opacity-80", theme.title)}>{metric.label}</span>
            <span className={cn("flex items-baseline gap-2", theme.title)}>
              <span className="font-display text-[1.05rem] font-semibold tabular-nums">
                {formatReportValue(metric.format, metric.value)}
              </span>
              <DeltaPill delta={metric.deltaPct} positiveIsGood={metric.positiveIsGood} />
            </span>
          </li>
        ))}
      </ul>
      {spark.length > 1 && (
        <Sparkline values={spark} className={cn("relative z-[1] mt-auto pt-4", theme.title)} />
      )}
    </Link>
  );
}

function PostsCanvas({
  posts,
  slug,
}: {
  posts: NonNullable<OperationalReport["posts"]>;
  slug: string;
}) {
  const theme = dashboardBrandTheme("publicacoes");
  return (
    <article className="lots-surface overflow-hidden p-0">
      <div className={cn("relative isolate overflow-hidden px-5 py-6 sm:px-6", theme.card)}>
        <PlatformBrandMark
          dashboardId="publicacoes"
          className={cn(
            "pointer-events-none absolute -right-4 -bottom-6 h-32 w-32 opacity-[0.16]",
            theme.watermark,
          )}
        />
        <div className="relative z-[1] flex items-start justify-between gap-3">
          <div>
            <p className={cn("text-[10.5px] font-semibold uppercase tracking-[0.14em] opacity-80", theme.title)}>
              Publicações
            </p>
            <p className={cn("mt-2 font-display text-4xl font-semibold tabular-nums leading-none", theme.title)}>
              {posts.count}
            </p>
          </div>
          <Link
            to="/cliente/$cliente/publicacoes"
            params={{ cliente: slug }}
            className={cn("lots-focus grid h-10 w-10 place-items-center rounded-2xl", theme.markWrap)}
          >
            <ArrowUpRight className={cn("h-4 w-4", theme.arrow)} />
          </Link>
        </div>
        <div className="relative z-[1] mt-5 grid grid-cols-2 gap-3">
          <MiniStat label="Views" value={formatReportValue("int", posts.views)} inverted />
          <MiniStat
            label="Interações"
            value={formatReportValue("int", posts.interactions)}
            inverted
          />
        </div>
      </div>
      {posts.highlights.length > 0 && (
        <div className="p-5 sm:p-6">
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Destaques
          </p>
          <BarChartLots
            rows={posts.highlights.map((post) => ({
              key: post.id,
              label: post.title ?? post.productType,
              value: post.views ?? post.interactions ?? 0,
              metric: "impressions",
              trailing: post.productType,
            }))}
          />
        </div>
      )}
    </article>
  );
}

function MiniStat({
  label,
  value,
  inverted = false,
}: {
  label: string;
  value: string;
  inverted?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl px-3 py-2.5", inverted ? "bg-white/15" : "bg-muted/50")}>
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          inverted ? "text-white/75" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className={cn("mt-1 font-display text-xl font-semibold tabular-nums", inverted && "text-white")}>
        {value}
      </p>
    </div>
  );
}

function ContentCanvas({
  content,
  slug,
}: {
  content: NonNullable<OperationalReport["content"]>;
  slug: string;
}) {
  const remaining = Math.max(content.planned - content.published, 0);
  return (
    <article className="lots-surface lots-petal-accent p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600">
            Conteúdos
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold">No calendário</h3>
        </div>
        <Link
          to="/cliente/$cliente/aprovacoes"
          params={{ cliente: slug }}
          className="lots-focus inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Abrir <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-5">
        <DonutChartLots
          metric="impressions"
          size={168}
          thickness={22}
          centerLabel="Publicados"
          centerValue={`${content.published}/${content.planned}`}
          slices={[
            { key: "published", label: "Publicados", value: content.published, tone: "primary" },
            ...(remaining > 0
              ? [{ key: "rest", label: "No fluxo", value: remaining, tone: "neutral" as const }]
              : []),
          ]}
        />
      </div>
      {content.byFormato.length > 0 && (
        <div className="mt-5">
          <BarChartLots
            rows={content.byFormato.map((row) => ({
              key: row.formato,
              label: row.formato,
              value: row.count,
              metric: "impressions",
              tone: "secondary",
            }))}
          />
        </div>
      )}
    </article>
  );
}

function CompareTrack({
  current,
  previous,
  className,
}: {
  current: number;
  previous: number;
  className?: string;
}) {
  const max = Math.max(current, previous, 1);
  return (
    <div className={cn("space-y-1.5", className)} aria-hidden>
      <div className="h-2 overflow-hidden rounded-full bg-muted/55">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
          style={{ width: `${Math.max(6, (current / max) * 100)}%` }}
        />
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full rounded-full bg-muted-foreground/35"
          style={{ width: `${Math.max(4, (previous / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const coords = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 26 - ((value - min) / span) * 24;
    return { x, y };
  });
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `M 0 28 ${coords.map((point) => `L ${point.x} ${point.y}`).join(" ")} L 100 28 Z`;

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className={cn("h-10 w-full overflow-visible opacity-80", className)}
      aria-hidden
    >
      <path d={area} fill="currentColor" className="opacity-20" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function sparkValues(platform: ReportPlatformSection): number[] {
  if (!platform.dailyMetricKey) return [];
  return platform.daily.map((point) => Number(point[platform.dailyMetricKey!] ?? 0) || 0);
}

function chartMetric(format: ValueFormat): CommonMetric {
  if (format === "currency") return "spend";
  if (format === "percent") return "ctr";
  return "impressions";
}
