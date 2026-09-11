import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import {
  buildContentInsights,
  postThumbUrl,
  type ContentInsights,
} from "@/modules/approval/services/build-content-insights";
import { getInstagramPostThumbUrlFn } from "@/modules/instagram-posts/instagram-posts.server";

function maxAvg(values: Array<{ avg: number }>): number {
  return Math.max(0, ...values.map((row) => row.avg));
}

function formatScore(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10} mil`;
  return Math.round(value).toLocaleString("pt-BR");
}

function InsightThumb({
  post,
  score,
  onClick,
}: {
  post: IgMediaRow;
  score: number;
  onClick: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(postThumbUrl(post));
  const linha = post.contentCard?.linhaEditorial ?? null;

  useEffect(() => {
    if (!post.thumbnail_storage_path) return;
    let cancelled = false;
    getInstagramPostThumbUrlFn({
      data: {
        cadastroClienteId: post.cadastro_cliente_id,
        storagePath: post.thumbnail_storage_path,
      },
    }).then((res) => {
      if (!cancelled && res.url) setThumb(res.url);
    });
    return () => {
      cancelled = true;
    };
  }, [post.cadastro_cliente_id, post.thumbnail_storage_path]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-muted"
    >
      <span className="block aspect-[4/5] w-full">
        {thumb ? (
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 bg-muted" />
        )}
      </span>
      <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
      <span className="absolute bottom-2 left-2 text-lg font-semibold tabular-nums text-white">
        {score > 0 ? formatScore(score) : "—"}
      </span>
      <span
        className={cn(
          "absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold",
          linha ? "bg-black/55 text-white" : "bg-white/20 text-white/80",
        )}
      >
        {linha || "—"}
      </span>
    </button>
  );
}

export function ContentInsightsPanel({
  posts,
  onOpenCard,
  onOpenPermalink,
}: {
  posts: IgMediaRow[];
  onOpenCard?: (cardId: string) => void;
  onOpenPermalink?: (url: string) => void;
}) {
  const insights: ContentInsights = buildContentInsights(posts);
  const dayMax = maxAvg(insights.days) || 1;
  const hourMax = maxAvg(insights.hours) || 1;

  return (
    <section className="min-w-0 space-y-5 overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="space-y-3">
        <p className="text-sm font-semibold">Melhores postagens</p>
        {insights.top7.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há publicações para este cliente.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {insights.top7.map((row) => (
              <InsightThumb
                key={row.post.id}
                post={row.post}
                score={row.score}
                onClick={() => {
                  if (row.post.content_card_id && onOpenCard) {
                    onOpenCard(row.post.content_card_id);
                    return;
                  }
                  if (row.post.permalink && onOpenPermalink) onOpenPermalink(row.post.permalink);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Melhores dias
          </p>
          <div className="grid grid-cols-7 items-end gap-1.5">
            {insights.days.map((day) => (
              <div key={day.label} className="flex min-w-0 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end rounded-md bg-muted/60">
                  <div
                    className="w-full rounded-md bg-foreground/80"
                    style={{ height: `${Math.max(day.avg > 0 ? 12 : 0, (day.avg / dayMax) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Melhores horários
          </p>
          <div className="grid grid-cols-8 items-end gap-1.5">
            {insights.hours.map((band) => (
              <div key={band.start} className="flex min-w-0 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end rounded-md bg-muted/60">
                  <div
                    className="w-full rounded-md bg-foreground/70"
                    style={{
                      height: `${Math.max(band.avg > 0 ? 12 : 0, (band.avg / hourMax) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                  {band.start}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
