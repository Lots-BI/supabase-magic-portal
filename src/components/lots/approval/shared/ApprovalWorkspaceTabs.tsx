import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, FolderDown, LayoutGrid, Library, Layers } from "lucide-react";

export type ApprovalTab = "calendar" | "kanban" | "materials" | "library" | "pillars";

export function ApprovalWorkspaceTabs({
  value,
  onChange,
  variant = "admin",
}: {
  value: ApprovalTab;
  onChange: (tab: ApprovalTab) => void;
  variant?: "admin" | "client";
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ApprovalTab)}>
      <TabsList className="h-auto flex-wrap justify-start gap-1">
        <TabsTrigger value="calendar" className="gap-1.5">
          <CalendarDays className="h-4 w-4" />
          Calendário
        </TabsTrigger>
        <TabsTrigger value="kanban" className="gap-1.5">
          <LayoutGrid className="h-4 w-4" />
          Fila
        </TabsTrigger>
        {variant === "admin" ? (
          <TabsTrigger value="materials" className="gap-1.5">
            <FolderDown className="h-4 w-4" />
            Materiais
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="library" className="gap-1.5">
          <Library className="h-4 w-4" />
          Publicados
        </TabsTrigger>
        <TabsTrigger value="pillars" className="gap-1.5">
          <Layers className="h-4 w-4" />
          Pilares
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
