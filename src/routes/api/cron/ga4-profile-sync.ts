import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runGa4Cron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/ga4-profile-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runGa4Cron),
    },
  },
});
