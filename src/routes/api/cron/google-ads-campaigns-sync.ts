import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runGoogleAdsCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/google-ads-campaigns-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runGoogleAdsCron),
    },
  },
});
