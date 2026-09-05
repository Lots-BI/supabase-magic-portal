import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, CalendarDays, Layers, Table2, Library } from "lucide-react";

export type ApprovalTab = "kanban" | "calendar" | "pillars" | "stories" | "library";

export function ApprovalWorkspaceTabs({
  value,
  onChange,
}: {
  value: ApprovalTab;
  onChange: (tab: ApprovalTab) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ApprovalTab)}>
      <TabsList className="h-auto flex-wrap justify-start gap-1">
        <TabsTrigger value="kanban" className="gap-1.5">
          <LayoutGrid className="h-4 w-4" />
          Kanban
        </TabsTrigger>
        <TabsTrigger value="calendar" className="gap-1.5">
          <CalendarDays className="h-4 w-4" />
          Calendário
        </TabsTrigger>
        <TabsTrigger value="pillars" className="gap-1.5">
          <Layers className="h-4 w-4" />
          Pilares
        </TabsTrigger>
        <TabsTrigger value="stories" className="gap-1.5">
          <Table2 className="h-4 w-4" />
          Stories
        </TabsTrigger>
        <TabsTrigger value="library" className="gap-1.5">
          <Library className="h-4 w-4" />
          Biblioteca
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
