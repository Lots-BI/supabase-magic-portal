import type { ContentCardStatus } from "@/modules/approval/types/content-card";
import { KANBAN_COLUMNS } from "@/modules/approval/workflow/column-config";
import { canTransitionStatus } from "@/modules/approval/workflow/status-machine";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KANBAN_COLUMN_META } from "./kanban-meta";

export function MobileStatusPicker({
  currentStatus,
  onSelect,
}: {
  currentStatus: ContentCardStatus;
  onSelect: (status: ContentCardStatus) => void;
}) {
  const allowed = KANBAN_COLUMNS.filter(
    (col) => col.status !== currentStatus && canTransitionStatus(currentStatus, col.status),
  );

  if (allowed.length === 0) return null;

  return (
    <Select onValueChange={(v) => onSelect(v as ContentCardStatus)}>
      <SelectTrigger className="w-full sm:hidden">
        <SelectValue placeholder="Mover para…" />
      </SelectTrigger>
      <SelectContent>
        {allowed.map((col) => (
          <SelectItem key={col.status} value={col.status}>
            {KANBAN_COLUMN_META[col.status].emoji} {col.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
