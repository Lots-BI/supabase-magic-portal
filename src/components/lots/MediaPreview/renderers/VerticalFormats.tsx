import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDuration, initialsFromName, parseCaption } from "@/lib/media-preview";
import type { MediaPreviewContext } from "@/lib/media-preview";
import { InlineVideoPlayer } from "./InlineVideoPlayer";

export function ReelRenderer({ ctx }: { ctx: MediaPreviewContext }) {
  const asset = ctx.assets[0];
  const { text } = parseCaption(ctx.caption);

  if (!asset) {
    return (
      <div className="flex aspect-[9/16] max-h-[520px] items-center justify-center bg-black text-white/50">
        Sem mídia
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
      <InlineVideoPlayer asset={asset} vertical />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-16">
        <div className="flex items-end gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-white/30">
            {ctx.accountAvatarUrl && <AvatarImage src={ctx.accountAvatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/30 text-[10px] text-white">
              {initialsFromName(ctx.accountName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{ctx.accountName}</p>
            {text && <p className="line-clamp-2 text-[12px] text-white/85">{text}</p>}
          </div>
        </div>
        {asset.durationSeconds != null && (
          <p className="mt-2 text-[10px] text-white/50">
            Duração · {formatDuration(asset.durationSeconds)}
          </p>
        )}
      </div>
    </div>
  );
}

export function StoryRenderer({ ctx }: { ctx: MediaPreviewContext }) {
  const asset = ctx.assets[0];

  return (
    <div className="relative mx-auto max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
      {/* Barra superior estilo story */}
      <div className="absolute inset-x-0 top-0 z-20 space-y-2 p-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-0.5 flex-1 overflow-hidden rounded-full bg-white/25")}>
              <div
                className={cn(
                  "h-full rounded-full bg-white transition-all",
                  i === 0 ? "w-full" : "w-0",
                )}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 ring-2 ring-primary">
            {ctx.accountAvatarUrl && <AvatarImage src={ctx.accountAvatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/30 text-[9px] text-white">
              {initialsFromName(ctx.accountName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[12px] font-semibold text-white">{ctx.accountName}</span>
          <span className="text-[11px] text-white/50">agora</span>
        </div>
      </div>

      <div className="aspect-[9/16] max-h-[520px]">
        {!asset ? (
          <div className="flex h-full items-center justify-center text-white/40">Sem mídia</div>
        ) : asset.kind === "video" ? (
          <InlineVideoPlayer asset={asset} vertical className="h-full max-h-none" />
        ) : (
          <img src={asset.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
    </div>
  );
}
