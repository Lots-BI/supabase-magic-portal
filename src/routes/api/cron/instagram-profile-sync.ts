import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runInstagramProfileCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/instagram-profile-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runInstagramProfileCron),
    },
  },
});
