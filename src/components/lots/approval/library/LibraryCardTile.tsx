import type { ContentCard } from "@/modules/approval/types/content-card";
import type { PillarSummary } from "../shared/PillarBadge";
import { cn } from "@/lib/utils";
import { formatCardSchedule } from "../kanban/kanban-meta";
import { Archive, ImageIcon } from "lucide-react";

export function LibraryCardTile({
  card,
  pillar,
  onOpen,
  layout,
}: {
  card: ContentCard;
  pillar?: PillarSummary | null;
  onOpen: () => void;
  layout: "grid" | "list";
}) {
  const isArchived = card.status === "arquivado";

  if (layout === "list") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md"
      >
        <Thumb url={card.capa_url} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {pillar && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: pillar.cor }}
                aria-hidden
              />
            )}
            <p className="truncate font-medium">{card.titulo}</p>
            {isArchived && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                <Archive className="h-3 w-3" />
                Arquivado
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {card.cliente_nome} · {card.plataforma}
            {card.formato ? ` · ${card.formato}` : ""} ·{" "}
            {formatCardSchedule(card.data_publicacao, card.hora_publicacao)}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md",
      )}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {card.capa_url ? (
          <img src={card.capa_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-40" />
          </div>
        )}
        {pillar && (
          <span
            className="absolute left-2 top-2 h-3 w-3 rounded-full ring-2 ring-background"
            style={{ backgroundColor: pillar.cor }}
          />
        )}
        {isArchived && (
          <span className="absolute right-2 top-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Arquivado
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{card.titulo}</p>
        <p className="text-[11px] text-muted-foreground">
          {card.cliente_nome} · {card.plataforma}
        </p>
      </div>
    </button>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}
