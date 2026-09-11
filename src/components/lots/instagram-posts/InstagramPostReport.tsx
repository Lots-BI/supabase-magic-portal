import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IgContentCardLink, IgMediaRow } from "@/modules/instagram-posts/types";
import { FORMAT_LABEL, type ContentFormato } from "@/modules/approval/types/content-card";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { formatCardSchedule } from "@/components/lots/approval/kanban/kanban-meta";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/lots/SectionCard";
import { ChartFrame } from "@/components/lots/charts/ChartFrame";
import { BarChartLots } from "@/components/lots/charts/BarChartLots";
import { AreaChartLotsLazy } from "@/components/lots/charts/AreaChartLotsLazy";
import {
  getInstagramPostThumbUrlFn,
  listInstagramPostHistoryFn,
} from "@/modules/instagram-posts/instagram-posts.server";
import {
  formatMetricValue,
} from "./format-metrics";
import { bandLabel, buildPostReport, type PerformanceBand } from "./post-report";

export function InstagramPostReport({
  post,
  posts,
  isAdmin,
  onClose,
}: {
  post: IgMediaRow | null;
  posts: IgMediaRow[];
  isAdmin?: boolean;
  onClose: () => void;
}) {
  const report = useMemo(
    () => (post ? buildPostReport(post, posts) : null),
    [post, posts],
  );

  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!post) {
      setThumbUrl(null);
      return;
    }
    setThumbUrl(post.thumbnail_url ?? post.media_url ?? null);
    if (!post.thumbnail_storage_path) return;
    let cancelled = false;
    getInstagramPostThumbUrlFn({
      data: {
        cadastroClienteId: post.cadastro_cliente_id,
        storagePath: post.thumbnail_storage_path,
      },
    }).then((res) => {
      if (!cancelled && res.url) setThumbUrl(res.url);
    });
    return () => {
      cancelled = true;
    };
  }, [post]);

  const historyQuery = useQuery({
    queryKey: ["instagram-post-history", post?.id],
    enabled: Boolean(post?.id),
    queryFn: () =>
      listInstagramPostHistoryFn({
        data: {
          cadastroClienteId: post!.cadastro_cliente_id,
          mediaId: post!.id,
        },
      }),
  });

  const historySeries = useMemo(
    () => pivotHistory(historyQuery.data?.points ?? []),
    [historyQuery.data?.points],
  );

  if (!post || !report) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl gap-6">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-xl">
            Relatório da publicação · {report.productLabel}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(post.published_at).toLocaleString("pt-BR")}
            {post.media_type ? ` · ${post.media_type}` : ""}
          </p>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
              {thumbUrl ? (
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" aria-hidden />
                </div>
              )}
            </div>
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Abrir no Instagram <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="space-y-4">
            <div className="lots-surface p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600">
                Leitura
              </p>
              <p className="mt-1 font-display text-lg font-semibold leading-snug">{report.headline}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {report.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            {post.caption && (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {post.caption}
              </p>
            )}
            {post.contentCard && (
              <EditorialCardBlock
                card={post.contentCard}
                cadastroClienteId={post.cadastro_cliente_id}
                clienteSlug={post.cliente_slug}
                isAdmin={Boolean(isAdmin)}
              />
            )}
            {post.media_product_type === "STORY" && (
              <p className="text-xs text-muted-foreground">
                Stories expiram nas métricas da API após cerca de 24h. Números depois disso podem
                ficar incompletos.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SectionCard
            eyebrow="O que performou bem"
            title={report.strengths.length > 0 ? `${report.strengths.length} métrica(s)` : "Nenhum destaque positivo"}
            description={
              report.sampleSize > 0
                ? `Vs ${report.cohortLabel}.`
                : "Sem outras publicações para comparar neste recorte."
            }
            bodyClassName="px-0 py-0 sm:px-0 sm:py-0"
          >
            <CalloutList rows={report.strengths} empty="Nada claramente acima da média neste recorte." />
          </SectionCard>
          <SectionCard
            eyebrow="O que ficou abaixo"
            title={
              report.weaknesses.length > 0
                ? `${report.weaknesses.length} métrica(s)`
                : "Nenhum ponto fraco claro"
            }
            description={
              report.sampleSize > 0
                ? `Vs ${report.cohortLabel}.`
                : "Sem outras publicações para comparar neste recorte."
            }
            bodyClassName="px-0 py-0 sm:px-0 sm:py-0"
          >
            <CalloutList rows={report.weaknesses} empty="Nada claramente abaixo da média neste recorte." />
          </SectionCard>
        </div>

        {report.chartComparisons.length > 0 && (
          <ChartFrame
            eyebrow="Comparação"
            title="Esta publicação vs média das outras"
            description={`Barras = valor desta peça. O rótulo à direita é a média de ${report.cohortLabel}.`}
          >
            <VsAverageBars rows={report.chartComparisons} />
          </ChartFrame>
        )}

        {report.mix.length > 0 && (
          <ChartFrame
            eyebrow="Composição"
            title="De onde vieram as interações"
            description="Curtidas, comentários, salvos, compartilhamentos e respostas coletados nesta peça."
          >
            <BarChartLots
              rows={report.mix.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.value,
                metric: "engagement" as const,
              }))}
            />
          </ChartFrame>
        )}

        {historySeries.dates.length >= 2 && (
          <ChartFrame
            eyebrow="Evolução"
            title="Métricas ao longo das coletas"
            description="Cada ponto é um Puxar métricas (histórico em ig_media_metrics_history)."
          >
            <AreaChartLotsLazy
              data={historySeries.dates}
              yMetric="reach"
              height={220}
              series={historySeries.series}
            />
          </ChartFrame>
        )}

        <SectionCard
          eyebrow="Inventário"
          title="Todas as métricas coletadas"
          description="Tudo o que o Hub gravou nesta publicação, com média, variação e posição no recorte."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Métrica</th>
                  <th className="py-2 pr-3 font-medium">Esta pub</th>
                  <th className="py-2 pr-3 font-medium">Média</th>
                  <th className="py-2 pr-3 font-medium">Vs média</th>
                  <th className="py-2 pr-3 font-medium">Posição</th>
                  <th className="py-2 font-medium">Leitura</th>
                </tr>
              </thead>
              <tbody>
                {report.comparisons.map((row) => (
                  <tr key={row.key} className="border-b border-border/70">
                    <td className="py-2 pr-3 font-medium">{row.label}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatCell(row.key, row.value)}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                      {row.average == null ? "—" : formatCell(row.key, row.average)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.deltaPct == null
                        ? "—"
                        : `${row.deltaPct >= 0 ? "+" : ""}${row.deltaPct.toFixed(0)}%`}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                      {row.rank == null ? "—" : `${row.rank}º / ${row.cohortSize}`}
                    </td>
                    <td className="py-2">
                      <BandBadge band={row.band} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </DialogContent>
    </Dialog>
  );
}

function EditorialCardBlock({
  card,
  cadastroClienteId,
  clienteSlug,
  isAdmin,
}: {
  card: IgContentCardLink;
  cadastroClienteId: number;
  clienteSlug?: string;
  isAdmin: boolean;
}) {
  const formato =
    card.formato && card.formato in FORMAT_LABEL
      ? FORMAT_LABEL[card.formato as ContentFormato]
      : card.formato;
  const statusLabel =
    KANBAN_COLUMNS.find((col) => col.status === card.status)?.label ?? card.status;
  const rows: Array<{ label: string; value: string }> = [
    { label: "Título", value: card.titulo },
    { label: "Status", value: statusLabel },
    ...(formato ? [{ label: "Formato planejado", value: formato }] : []),
    ...(card.linhaEditorial ? [{ label: "Linha editorial", value: card.linhaEditorial }] : []),
    ...(card.tema ? [{ label: "Tema", value: card.tema }] : []),
    ...(card.pilarTitulo ? [{ label: "Pilar", value: card.pilarTitulo }] : []),
    ...(card.cta ? [{ label: "CTA", value: card.cta }] : []),
    {
      label: "Agenda",
      value: formatCardSchedule(card.dataPublicacao, card.horaPublicacao),
    },
    ...(card.tags && card.tags.length > 0 ? [{ label: "Tags", value: card.tags.join(", ") }] : []),
  ];

  return (
    <div className="lots-surface space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600">
            Conteúdos
          </p>
          <p className="mt-1 text-sm font-medium">Peça editorial ligada a esta publicação</p>
        </div>
        {isAdmin ? (
          <Link
            to="/admin/aprovacoes"
            search={{ cliente: cadastroClienteId, card: card.id }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Abrir no Conteúdos
          </Link>
        ) : clienteSlug ? (
          <Link
            to="/cliente/$cliente/aprovacoes"
            params={{ cliente: clienteSlug }}
            search={{ card: card.id }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Abrir no Conteúdos
          </Link>
        ) : (
          <Link
            to="/aprovacoes"
            search={{ card: card.id }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Abrir no Conteúdos
          </Link>
        )}
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] text-muted-foreground">{row.label}</dt>
            <dd className="text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
      {card.excerpt && (
        <p className="text-sm leading-relaxed text-muted-foreground">{card.excerpt}</p>
      )}
    </div>
  );
}

function formatCell(key: string, value: number): string {
  if (key === "engagement_rate") return `${value.toFixed(1)}%`;
  return formatMetricValue(key, value);
}

function BandBadge({ band }: { band: PerformanceBand }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        (band === "strong" || band === "above") &&
          "border-transparent bg-success/12 text-[color:var(--success)]",
        (band === "weak" || band === "below") &&
          "border-transparent bg-danger/12 text-[color:var(--danger)]",
        (band === "inline" || band === "no_baseline") && "text-muted-foreground",
      )}
    >
      {bandLabel(band)}
    </Badge>
  );
}

function CalloutList({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: string; value: number; deltaPct: number | null; rank: number | null; cohortSize: number }>;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-4 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.key} className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm">
          <span className="font-medium">{row.label}</span>
          <span className="tabular-nums text-muted-foreground">
            {formatCell(row.key, row.value)}
            {row.deltaPct != null
              ? ` · ${row.deltaPct >= 0 ? "+" : ""}${row.deltaPct.toFixed(0)}%`
              : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function VsAverageBars({
  rows,
}: {
  rows: Array<{ key: string; label: string; value: number; average: number | null }>;
}) {
  const cap = rows.reduce((max, row) => Math.max(max, row.value, row.average ?? 0), 0);
  return (
    <ul className="space-y-3 px-1 sm:px-2">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
            <span className="font-medium">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCell(row.key, row.value)}
              {row.average != null ? ` · média ${formatCell(row.key, row.average)}` : ""}
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                style={{ width: `${cap > 0 ? Math.max(2, (row.value / cap) * 100) : 0}%` }}
              />
            </div>
            {row.average != null && (
              <div className="h-1 overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full bg-muted-foreground/45"
                  style={{ width: `${cap > 0 ? Math.max(2, (row.average / cap) * 100) : 0}%` }}
                />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function pivotHistory(
  points: Array<{ metricKey: string; value: number; collectedAt: string }>,
): {
  dates: Array<Record<string, number | string>>;
  series: Array<{ key: string; label: string; metric: "reach" | "impressions"; tone: "primary" | "secondary" | "success" }>;
} {
  const wanted = ["views", "reach", "total_interactions"] as const;
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const byDay = new Map<string, Record<string, number>>();
  for (const point of points) {
    if (!wanted.includes(point.metricKey as (typeof wanted)[number])) continue;
    if (!Number.isFinite(point.value)) continue;
    const day = dayFmt.format(new Date(point.collectedAt));
    const row = byDay.get(day) ?? {};
    row[point.metricKey] = point.value;
    byDay.set(day, row);
  }
  const dates = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, metrics]) => ({ date, ...metrics }));
  const present = new Set(dates.flatMap((row) => Object.keys(row).filter((k) => k !== "date")));
  const series = (
    [
      { key: "views", label: "Visualizações", metric: "impressions" as const, tone: "primary" as const },
      { key: "reach", label: "Alcance", metric: "reach" as const, tone: "secondary" as const },
      {
        key: "total_interactions",
        label: "Interações",
        metric: "impressions" as const,
        tone: "success" as const,
      },
    ] as const
  ).filter((s) => present.has(s.key));
  return { dates, series };
}
