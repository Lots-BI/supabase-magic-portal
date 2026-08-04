import { useDroppable } from "@dnd-kit/core";
import type { ContentCard } from "@/modules/approval/types/content-card";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import type { PillarSummary } from "../shared/PillarBadge";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import { KANBAN_COLUMN_META } from "./kanban-meta";

export function KanbanColumn({
  status,
  label,
  cards,
  pillarMap,
  thumbMap,
  onOpenCard,
  showCliente,
  readOnly = false,
  disableDrag = false,
  onMoveCard,
}: {
  status: ContentCardStatus;
  label: string;
  cards: ContentCard[];
  pillarMap: Record<string, PillarSummary>;
  thumbMap: Record<string, string | null>;
  onOpenCard: (id: string) => void;
  showCliente?: boolean;
  readOnly?: boolean;
  disableDrag?: boolean;
  onMoveCard?: (input: { id: string; status: ContentCardStatus; kanban_ordem: number }) => void;
}) {
  const meta = KANBAN_COLUMN_META[status];
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
    disabled: readOnly || disableDrag,
  });

  return (
    <div className="flex w-[min(100%,20rem)] shrink-0 flex-col">
      <div
        className={cn("mb-3 flex items-center gap-2 rounded-lg border px-3 py-2", meta.headerClass)}
      >
        <span aria-hidden>{meta.emoji}</span>
        <span className={cn("h-2 w-2 rounded-full", meta.dotClass)} />
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="ml-auto rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[12rem] flex-1 flex-col gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 p-2 transition-colors",
          isOver && "border-primary/40 bg-primary/5",
        )}
      >
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            pillar={card.pilar_id ? pillarMap[card.pilar_id] : null}
            thumbnailUrl={thumbMap[card.id] ?? card.capa_url}
            onOpen={() => onOpenCard(card.id)}
            showCliente={showCliente}
            readOnly={readOnly}
            disableDrag={disableDrag}
            onMoveStatus={
              onMoveCard
                ? (nextStatus) =>
                    onMoveCard({
                      id: card.id,
                      status: nextStatus,
                      kanban_ordem: cards.length,
                    })
                : undefined
            }
          />
        ))}
        {cards.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {readOnly || disableDrag ? "Nenhum conteúdo nesta etapa" : "Arraste cards aqui"}
          </p>
        )}
      </div>
    </div>
  );
}
