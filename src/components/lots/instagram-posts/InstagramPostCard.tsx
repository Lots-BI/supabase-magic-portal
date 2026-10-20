import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ImageIcon, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { pctDelta } from "@/lib/platforms/engine";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import { formatMetricValue, formatProductTypeLabel, pickDisplayMetrics } from "./format-metrics";
import { getInstagramPostThumbUrlFn } from "@/modules/instagram-posts/instagram-posts.server";

const LOWER_IS_BETTER = new Set(["exits"]);

export function InstagramPostCard({
  post,
  previousAverages,
  onOpen,
}: {
  post: IgMediaRow;
  previousAverages?: Record<string, number>;
  onOpen: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(
    post.thumbnail_url ?? post.media_url ?? null,
  );

  useEffect(() => {
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
  }, [post.cadastro_cliente_id, post.thumbnail_storage_path]);

  const metrics = pickDisplayMetrics(post.metrics, post.media_product_type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" aria-hidden />
          </div>
        )}
        <span
          className={cn(
            "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            post.media_product_type === "STORY"
              ? "bg-violet-500/90 text-white"
              : post.media_product_type === "REELS"
                ? "bg-fuchsia-500/90 text-white"
                : "bg-black/70 text-white",
          )}
        >
          {formatProductTypeLabel(post.media_product_type)}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <p className="text-[11px] text-muted-foreground">
          {new Date(post.published_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
        {post.contentCard && (
          <p className="line-clamp-2 text-[12px] font-medium leading-snug">
            {post.contentCard.titulo}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {metrics.map((metric) => {
            const baseline = previousAverages?.[metric.key];
            const delta =
              baseline == null ? null : pctDelta(metric.value, baseline);
            const positiveIsGood = !LOWER_IS_BETTER.has(metric.key);
            const trend = delta == null ? null : delta === 0 ? "flat" : delta > 0 ? "up" : "down";
            const good = trend == null || trend === "flat" ? null : (trend === "up") === positiveIsGood;
            return (
              <span
                key={metric.key}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
                title={
                  baseline == null
                    ? undefined
                    : `Média do período anterior: ${formatMetricValue(metric.key, baseline)}`
                }
              >
                {metric.label}: {formatMetricValue(metric.key, metric.value)}
                {delta != null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1 py-px text-[9px] font-semibold tabular-nums",
                      good === null && "bg-background text-muted-foreground",
                      good === true && "bg-success/12 text-[color:var(--success)]",
                      good === false && "bg-danger/12 text-[color:var(--danger)]",
                    )}
                  >
                    {trend === "flat" ? (
                      <Minus className="h-2.5 w-2.5" aria-hidden />
                    ) : trend === "up" ? (
                      <ArrowUpRight className="h-2.5 w-2.5" aria-hidden />
                    ) : (
                      <ArrowDownRight className="h-2.5 w-2.5" aria-hidden />
                    )}
                    {Math.abs(delta).toFixed(1)}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </button>
  );
}
