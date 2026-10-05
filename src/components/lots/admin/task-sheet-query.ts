import { queryOptions } from "@tanstack/react-query";
import { listTaskSheet } from "@/modules/agency-os/tasks-sheet.server";

export const taskSheetQuery = queryOptions({
  queryKey: ["admin", "tarefas"] as const,
  queryFn: () => listTaskSheet(),
});
