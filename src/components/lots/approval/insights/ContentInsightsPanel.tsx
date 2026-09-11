import { cn } from "@/lib/utils";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import {
  buildContentInsights,
  postThumbUrl,
  type ContentInsights,
} from "@/modules/approval/services/build-content-insights";

function maxAvg(values: Array<{ avg: number }>): number {
  return Math.max(0, ...values.map((row) => row.avg));
}

function formatScore(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10} mil`;
  return Math.round(value).toLocaleString("pt-BR");
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
    <section className="space-y-5 rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {insights.top7.map((row) => {
          const thumb = postThumbUrl(row.post);
          const linha = row.post.contentCard?.linhaEditorial ?? null;
          return (
            <button
              key={row.post.id}
              type="button"
              onClick={() => {
                if (row.post.content_card_id && onOpenCard) {
                  onOpenCard(row.post.content_card_id);
                  return;
                }
                if (row.post.permalink && onOpenPermalink) onOpenPermalink(row.post.permalink);
              }}
              className="relative h-[148px] w-[108px] shrink-0 overflow-hidden rounded-2xl border border-border bg-muted"
            >
              {thumb ? (
                <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <p className="absolute bottom-2 left-2 text-lg font-semibold tabular-nums text-white">
                {row.score > 0 ? formatScore(row.score) : "—"}
              </p>
              <span
                className={cn(
                  "absolute left-2 top-2 max-w-[90%] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  linha ? "bg-black/55 text-white" : "bg-white/20 text-white/80",
                )}
              >
                {linha || "—"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-7 items-end gap-1.5">
        {insights.days.map((day) => (
          <div key={day.label} className="flex flex-col items-center gap-1">
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

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {insights.hours.map((band) => (
          <div key={band.start} className="space-y-1">
            <div className="h-10 overflow-hidden rounded-md bg-muted/60">
              <div
                className="h-full rounded-md bg-foreground/70"
                style={{
                  width: `${Math.max(band.avg > 0 ? 10 : 0, (band.avg / hourMax) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] tabular-nums text-muted-foreground">{band.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
