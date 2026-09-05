import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fakeLikeCount,
  formatScheduledDate,
  initialsFromName,
  parseCaption,
} from "@/lib/media-preview";
import type { MediaPreviewContext } from "@/lib/media-preview";

/** Chrome visual inspirado em feed social — não é cópia da UI oficial. */
export function InstagramChrome({
  ctx,
  children,
  compact,
  className,
}: {
  ctx: MediaPreviewContext;
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const { text, hashtags } = parseCaption(ctx.caption);
  const likes = ctx.showEngagement ? fakeLikeCount(ctx.accountName + ctx.scheduledAt) : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-[#0a0a0a] text-white shadow-xl transition-shadow duration-300",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2.5">
        <Avatar className="h-8 w-8 ring-2 ring-primary/40">
          {ctx.accountAvatarUrl && <AvatarImage src={ctx.accountAvatarUrl} alt="" />}
          <AvatarFallback className="bg-primary/20 text-[11px] font-semibold text-primary-200">
            {initialsFromName(ctx.accountName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">{ctx.accountName}</p>
          {ctx.location && <p className="truncate text-[11px] text-white/55">{ctx.location}</p>}
        </div>
        <MoreHorizontal className="h-5 w-5 shrink-0 text-white/50" aria-hidden />
      </div>

      {/* Mídia */}
      <div className="relative bg-black">{children}</div>

      {/* Ações visuais */}
      {!compact && (
        <>
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-4">
              <Heart className="h-6 w-6 text-white/90" aria-hidden />
              <MessageCircle className="h-6 w-6 text-white/90" aria-hidden />
              <Send className="h-6 w-6 text-white/90" aria-hidden />
            </div>
            <Bookmark className="h-6 w-6 text-white/90" aria-hidden />
          </div>

          {ctx.showEngagement && (
            <p className="px-3 pb-1 text-[13px] font-semibold">
              {likes.toLocaleString("pt-BR")} curtidas
            </p>
          )}

          {(text || hashtags.length > 0) && (
            <div className="space-y-1 px-3 pb-2">
              {text && (
                <p className="text-[13px] leading-snug">
                  <span className="font-semibold">{ctx.accountName} </span>
                  <span className="text-white/90">{text}</span>
                </p>
              )}
              {hashtags.length > 0 && (
                <p className="text-[12px] text-secondary-300">{hashtags.join(" ")}</p>
              )}
            </div>
          )}

          <div className="border-t border-white/8 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-white/40">
              Adicionar comentário…
            </p>
          </div>

          {ctx.scheduledAt && (
            <p className="border-t border-white/8 px-3 py-2 text-[10px] text-white/35">
              Programado para {formatScheduledDate(ctx.scheduledAt)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
