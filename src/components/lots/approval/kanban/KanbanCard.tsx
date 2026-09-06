import type { ContentCard } from "@/modules/approval/types/content-card";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatCardSchedule, publishConfirmationLabel, responsavelLabel } from "./kanban-meta";
import type { PillarSummary } from "../shared/PillarBadge";

export function KanbanCard({
  card,
  pillar,
  thumbnailUrl,
  onOpen,
  showCliente,
  readOnly = false,
}: {
  card: ContentCard;
  pillar?: PillarSummary | null;
  thumbnailUrl?: string | null;
  onOpen: () => void;
  showCliente?: boolean;
  readOnly?: boolean;
}) {
  const draggable = useDraggable({
    id: card.id,
    data: { card, status: card.status },
    disabled: readOnly,
  });

  const style = draggable.transform
    ? {
        transform: CSS.Translate.toString(draggable.transform),
        zIndex: draggable.isDragging ? 50 : undefined,
      }
    : undefined;

  const className = cn(
    "group w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md",
    draggable.isDragging && "opacity-60 shadow-lg ring-2 ring-primary/30",
  );

  const body = (
    <>
      <div className="flex gap-3">
        {thumbnailUrl ? (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {thumbnailUrl.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={thumbnailUrl} className="h-full w-full object-cover" muted />
            ) : (
              <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-[10px] text-muted-foreground">
            Sem mídia
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {card.titulo}
          </p>
          {showCliente && (
            <p className="truncate text-xs text-muted-foreground">{card.cliente_nome}</p>
          )}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{card.plataforma}</span>
            {card.formato && <span>· {card.formato}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
          </p>
          {publishConfirmationLabel(card) ? (
            <p
              className={
                card.publish_status === "failed"
                  ? "text-[11px] text-destructive"
                  : "text-[11px] text-muted-foreground"
              }
            >
              {publishConfirmationLabel(card)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
        <span className="truncate">{responsavelLabel(card.responsavel_email)}</span>
        {pillar && (
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-muted px-2 py-0.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: pillar.cor }}
              aria-hidden
            />
            <span className="truncate">{pillar.titulo}</span>
          </span>
        )}
      </div>
    </>
  );

  if (readOnly) {
    return (
      <button type="button" onClick={onOpen} className={className}>
        {body}
      </button>
    );
  }

  return (
    <button
      ref={draggable.setNodeRef}
      type="button"
      style={style}
      {...draggable.listeners}
      {...draggable.attributes}
      onClick={(e) => {
        if (draggable.isDragging) return;
        e.stopPropagation();
        onOpen();
      }}
      className={className}
    >
      {body}
    </button>
  );
}
