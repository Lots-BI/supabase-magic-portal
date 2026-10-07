import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentCard } from "@/modules/approval/types/content-card";
import {
  agencyActionKind,
  clientActionBarClass,
  clientActionLabel,
  publicationDayNumber,
  publicationFullDateLabel,
  stampForStatus,
  type ClientRevisionFlags,
} from "@/modules/approval/services/workflow-stamps";
import { roteiroHtmlToPlain } from "@/modules/approval/services/roteiro-scenes";

const ACTION_BAR: Record<string, string> = {
  escrever: "bg-sky-500 text-white",
  baixar: "bg-amber-400 text-zinc-950",
  editar: "bg-violet-500 text-white",
};

const STAMP_BAR: Record<string, string> = {
  ideia: "bg-sky-500 text-white",
  cliente_roteiro: "bg-emerald-500 text-white",
  peca: "bg-amber-400 text-zinc-950",
  cliente_peca: "bg-emerald-500 text-white",
  no_ar: "bg-zinc-900 text-white",
};

function agencyBarClass(card: ContentCard): string {
  const action = agencyActionKind(card.status);
  if (action) return ACTION_BAR[action];
  const stamp = stampForStatus(card.status);
  return stamp
    ? (STAMP_BAR[stamp.id] ?? "bg-foreground text-background")
    : "bg-muted text-foreground";
}

function agencyBarLabel(card: ContentCard): string | null {
  const action = agencyActionKind(card.status);
  if (action === "escrever") return "Escrever";
  if (action === "baixar") return "Baixar";
  if (action === "editar") return "Editar";
  return stampForStatus(card.status)?.label ?? null;
}

export function ContentPosterCard({
  card,
  thumbnailUrl,
  size = "strip",
  audience = "agency",
  revision,
  onOpen,
}: {
  card: ContentCard;
  thumbnailUrl?: string | null;
  size?: "hero" | "strip";
  audience?: "agency" | "client";
  revision?: ClientRevisionFlags;
  onOpen: () => void;
}) {
  const day = publicationDayNumber(card.data_publicacao);
  const fullDate = publicationFullDateLabel(card.data_publicacao);
  const hero = size === "hero";
  const thumb = thumbnailUrl || card.capa_url;
  const isVideo = !!thumb && /\.(mp4|webm|mov)(\?|$)/i.test(thumb);
  const textPreview = roteiroHtmlToPlain(card.roteiro || card.copy_text || card.legenda);
  const bar =
    audience === "client" ? clientActionLabel(card.status, revision) : agencyBarLabel(card);
  const barClass =
    audience === "client" ? clientActionBarClass(card.status, revision) : agencyBarClass(card);

  return (
    <div className={cn("flex flex-col gap-1.5", hero ? "w-full" : "w-[132px] shrink-0")}>
      {bar ? (
        <span
          className={cn(
            "flex min-h-7 w-full items-center justify-center rounded-full px-3 py-1 text-center text-[11px] font-bold leading-tight",
            audience === "agency" && "uppercase tracking-wide",
            barClass,
          )}
        >
          {bar}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "relative overflow-hidden rounded-3xl border border-border bg-muted text-left shadow-sm transition-transform active:scale-[0.99]",
          hero ? "aspect-[4/5] w-full" : "h-[188px] w-full",
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
      </button>
    </div>
  );
}
