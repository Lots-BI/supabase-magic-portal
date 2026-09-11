import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runInstagramMediaCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/instagram-media-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runInstagramMediaCron),
    },
  },
});
