import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runTaskDueAlertsCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/task-due-alerts")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runTaskDueAlertsCron),
    },
  },
});
