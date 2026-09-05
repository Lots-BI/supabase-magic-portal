import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StrategicPlanEntityListItem {
  id: string;
  title: string;
  subtitle?: string | null;
}

interface StrategicPlanEntityListProps {
  items: StrategicPlanEntityListItem[];
  emptyLabel?: string;
  editingId?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function StrategicPlanEntityList({
  items,
  emptyLabel = "Nenhum registro ainda.",
  editingId,
  onEdit,
  onDelete,
  className,
}: StrategicPlanEntityListProps) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2",
            editingId === item.id ? "border-primary/40 bg-primary/5" : "border-border",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                {item.subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`Editar ${item.title}`}
              onClick={() => onEdit(item.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label={`Excluir ${item.title}`}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
