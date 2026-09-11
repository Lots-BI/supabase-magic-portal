import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runCrmIngestCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/instagram-crm-comments-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runCrmIngestCron),
    },
  },
});
