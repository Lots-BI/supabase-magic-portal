import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runGoogleBusinessCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/google-business-profile-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runGoogleBusinessCron),
    },
  },
});
