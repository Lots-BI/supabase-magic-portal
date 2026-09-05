import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { memo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KanbanColumn<T> {
  id: string;
  label: string;
  items: T[];
}

function DraggableCard<T extends { id: string }>({
  item,
  columnId,
  renderCard,
}: {
  item: T;
  columnId: string;
  renderCard: (item: T, ctx: { isDragging: boolean }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item, columnId },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {renderCard(item, { isDragging })}
    </div>
  );
}

function DroppableColumn({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { columnId: id } });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[min(100%,20rem)] shrink-0 flex-col rounded-xl border border-border bg-muted/20",
        isOver && "border-primary/40 bg-primary/5",
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h3 className="font-display text-xs font-semibold text-foreground">{label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </header>
      <div className="flex min-h-[120px] flex-col gap-2 p-2">{children}</div>
    </div>
  );
}

export const GenericKanbanBoard = memo(function GenericKanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  onMove,
  readOnly = false,
}: {
  columns: KanbanColumn<T>[];
  renderCard: (item: T, ctx: { isDragging: boolean }) => ReactNode;
  onMove?: (item: T, fromColumnId: string, toColumnId: string) => void;
  readOnly?: boolean;
}) {
  const [active, setActive] = useState<T | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grid = (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => (
        <DroppableColumn key={col.id} id={col.id} label={col.label} count={col.items.length}>
          {col.items.map((item) =>
            readOnly ? (
              <div key={item.id}>{renderCard(item, { isDragging: false })}</div>
            ) : (
              <DraggableCard key={item.id} item={item} columnId={col.id} renderCard={renderCard} />
            ),
          )}
        </DroppableColumn>
      ))}
    </div>
  );

  if (readOnly || !onMove) return grid;

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as T | undefined;
    if (item) setActive(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActive(null);
    const { active: a, over } = event;
    if (!over) return;
    const item = a.data.current?.item as T | undefined;
    const fromColumnId = a.data.current?.columnId as string | undefined;
    const toColumnId = (over.data.current?.columnId ?? over.id) as string;
    if (!item || !fromColumnId || fromColumnId === toColumnId) return;
    onMove(item, fromColumnId, toColumnId);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {grid}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease-out" }}>
        {active ? (
          <div className="w-[18rem]">{renderCard(active, { isDragging: true })}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}) as <T extends { id: string }>(props: {
  columns: KanbanColumn<T>[];
  renderCard: (item: T, ctx: { isDragging: boolean }) => ReactNode;
  onMove?: (item: T, fromColumnId: string, toColumnId: string) => void;
  readOnly?: boolean;
}) => React.ReactElement;
