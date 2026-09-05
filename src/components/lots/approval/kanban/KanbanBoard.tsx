import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { memo, useState } from "react";
import type { KanbanBoard } from "@/modules/approval/services/build-kanban-board";
import type { ContentCard } from "@/modules/approval/types/content-card";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import type { PillarSummary } from "../shared/PillarBadge";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

export const KanbanBoardView = memo(function KanbanBoardView({
  board,
  pillarMap,
  thumbMap,
  onMoveCard,
  onOpenCard,
  showCliente,
  readOnly = false,
}: {
  board: KanbanBoard;
  pillarMap: Record<string, PillarSummary>;
  thumbMap: Record<string, string | null>;
  onMoveCard?: (input: { id: string; status: ContentCardStatus; kanban_ordem: number }) => void;
  onOpenCard: (id: string) => void;
  showCliente?: boolean;
  readOnly?: boolean;
}) {
  const [activeCard, setActiveCard] = useState<ContentCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4 sm:mx-0 sm:px-0">
      {board.columns.map((col) => (
        <KanbanColumn
          key={col.status}
          status={col.status}
          label={col.label}
          cards={col.cards}
          pillarMap={pillarMap}
          thumbMap={thumbMap}
          onOpenCard={onOpenCard}
          showCliente={showCliente}
          readOnly={readOnly}
        />
      ))}
    </div>
  );

  if (readOnly) return columns;

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as ContentCard | undefined;
    if (card) setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !onMoveCard) return;

    const card = active.data.current?.card as ContentCard | undefined;
    if (!card) return;

    const targetStatus = (over.data.current?.status ?? over.id) as ContentCardStatus;
    if (!targetStatus || card.status === targetStatus) return;

    const column = board.columns.find((c) => c.status === targetStatus);
    const kanban_ordem = column?.cards.length ?? 0;
    onMoveCard({ id: card.id, status: targetStatus, kanban_ordem });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {columns}
      <DragOverlay>
        {activeCard ? (
          <div className="w-[18rem] rotate-2 opacity-95">
            <KanbanCard
              card={activeCard}
              pillar={activeCard.pilar_id ? pillarMap[activeCard.pilar_id] : null}
              thumbnailUrl={thumbMap[activeCard.id] ?? activeCard.capa_url}
              onOpen={() => undefined}
              showCliente={showCliente}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});
