import { cn } from "@/lib/utils";
import type { ContentCard } from "@/modules/approval/types/content-card";
import {
  agencyActionKind,
  publicationDayNumber,
  stampForStatus,
} from "@/modules/approval/services/workflow-stamps";

export function ContentPosterCard({
  card,
  thumbnailUrl,
  size = "strip",
  onOpen,
}: {
  card: ContentCard;
  thumbnailUrl?: string | null;
  size?: "hero" | "strip";
  onOpen: () => void;
}) {
  const stamp = stampForStatus(card.status);
  const action = agencyActionKind(card.status);
  const day = publicationDayNumber(card.data_publicacao);
  const hero = size === "hero";
  const thumb = thumbnailUrl || card.capa_url;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-muted text-left shadow-sm transition-transform active:scale-[0.99]",
        hero ? "aspect-[4/5] w-full max-w-sm" : "h-[188px] w-[132px] shrink-0",
      )}
    >
      {thumb ? (
        thumb.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
          <video src={thumb} className="absolute inset-0 h-full w-full object-cover" muted />
        ) : (
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <p
          className={cn(
            "font-display font-semibold tabular-nums leading-none",
            hero ? "text-6xl" : "text-3xl",
          )}
        >
          {day}
        </p>
        <p className={cn("mt-1 line-clamp-2 font-medium", hero ? "text-base" : "text-[11px]")}>
          {card.titulo}
        </p>
      </div>
      {stamp ? (
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          {action ?? stamp.label}
        </span>
      ) : null}
    </button>
  );
}
