import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentCard } from "@/modules/approval/types/content-card";
import {
  agencyActionKind,
  publicationDayNumber,
  publicationFullDateLabel,
  stampForStatus,
} from "@/modules/approval/services/workflow-stamps";
import { roteiroHtmlToPlain } from "@/modules/approval/services/roteiro-scenes";

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
  const fullDate = publicationFullDateLabel(card.data_publicacao);
  const hero = size === "hero";
  const thumb = thumbnailUrl || card.capa_url;
  const isVideo = !!thumb && /\.(mp4|webm|mov)(\?|$)/i.test(thumb);
  const textPreview = roteiroHtmlToPlain(card.roteiro || card.copy_text || card.legenda);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-muted text-left shadow-sm transition-transform active:scale-[0.99]",
        hero ? "aspect-[4/5] w-full" : "h-[188px] w-[132px] shrink-0",
      )}
    >
      {thumb ? (
        isVideo ? (
          <video
            src={thumb}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
          />
        ) : (
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col gap-2 bg-gradient-to-br from-muted to-muted-foreground/15 p-3",
            hero ? "pb-24" : "pb-16",
          )}
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          {textPreview ? (
            <p
              className={cn(
                "overflow-hidden text-foreground/80",
                hero
                  ? "line-clamp-[10] text-sm leading-relaxed"
                  : "line-clamp-5 text-[11px] leading-snug",
              )}
            >
              {textPreview}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sem prévia de texto ainda.</p>
          )}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        {hero ? (
          <>
            <p className="font-display text-lg font-semibold capitalize leading-tight">
              {fullDate.weekday}
            </p>
            <p className="text-sm font-medium text-white/80">{fullDate.full}</p>
          </>
        ) : (
          <p className="font-display text-3xl font-semibold leading-none tabular-nums">{day}</p>
        )}
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
