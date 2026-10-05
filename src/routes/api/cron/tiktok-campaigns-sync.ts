import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runTikTokCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/tiktok-campaigns-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runTikTokCron),
    },
  },
});
