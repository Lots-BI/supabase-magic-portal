import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runMetaAdsCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/meta-ads-campaigns-sync")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runMetaAdsCron),
    },
  },
});
