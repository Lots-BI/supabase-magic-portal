import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runYouTubeCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/youtube-channel-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runYouTubeCron),
    },
  },
});
