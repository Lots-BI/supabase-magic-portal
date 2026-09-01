import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IgMediaRow } from "@/modules/instagram-posts/types";
import { formatProductTypeLabel, pickDisplayMetrics } from "./format-metrics";
import { getInstagramPostThumbUrlFn } from "@/modules/instagram-posts/instagram-posts.server";

export function InstagramPostCard({
  post,
  onOpen,
}: {
  post: IgMediaRow;
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
      className="group flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-left shadow-sm transition-shadow hover:shadow-md"
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
        <div className="flex flex-wrap gap-1.5">
          {metrics.map((metric) => (
            <span
              key={metric.key}
              className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
            >
              {metric.label}: {metric.value.toLocaleString("pt-BR")}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
