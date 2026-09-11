import { Link } from "@tanstack/react-router";
import { BarChart3, ExternalLink } from "lucide-react";
import type { PublishedIgSnapshot } from "@/modules/instagram-posts/types";
import {
  engagementRate,
  formatMetricValue,
  listAllDisplayMetrics,
} from "@/components/lots/instagram-posts/format-metrics";

export type { PublishedIgSnapshot };

const PRIMARY_KEYS = [
  "views",
  "reach",
  "total_interactions",
  "likes",
  "comments",
  "saves",
  "shares",
  "replies",
];

export function PublishedIgMetrics({ ig }: { ig: PublishedIgSnapshot | null | undefined }) {
  if (!ig) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Sem métricas da publicação. Use Puxar métricas na aba Publicações.
      </div>
    );
  }

  const all = listAllDisplayMetrics(ig.metrics, ig.mediaProductType || "FEED");
  const primary = PRIMARY_KEYS.map((key) => all.find((row) => row.key === key)).filter(
    (row): row is NonNullable<typeof row> => Boolean(row),
  );
  const extra = all.filter((row) => !PRIMARY_KEYS.includes(row.key)).slice(0, 4);
  const shown = [...primary, ...extra];
  const rate = engagementRate(ig.metrics);
  const reportHref =
    ig.clienteSlug && ig.mediaId
      ? {
          to: "/cliente/$cliente/publicacoes" as const,
          params: { cliente: ig.clienteSlug },
          search: { ig: ig.mediaId },
        }
      : null;

  return (
    <div className="space-y-3 rounded-lg border border-border px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">Desempenho no Instagram</p>
          <p className="text-xs text-muted-foreground">
            {ig.lastSyncedAt
              ? `Última coleta: ${new Date(ig.lastSyncedAt).toLocaleString("pt-BR")}`
              : "Métricas da aba Publicações"}
            {rate != null ? ` · Engajamento ${rate.toFixed(1)}%` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reportHref && (
            <Link
              {...reportHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              Relatório da publicação
            </Link>
          )}
          {ig.permalink && (
            <a
              href={ig.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Instagram
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Coleta ainda sem números nesta peça.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shown.map((row) => (
            <div key={row.key} className="rounded-md bg-muted/40 px-2.5 py-2">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatMetricValue(row.key, row.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
