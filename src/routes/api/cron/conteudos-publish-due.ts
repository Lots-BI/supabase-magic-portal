import { createFileRoute } from "@tanstack/react-router";
import { withCronAuth } from "@/modules/runtime/http";
import { runConteudosPublishDueCron } from "@/modules/runtime/cron-jobs.server";

export const Route = createFileRoute("/api/cron/conteudos-publish-due")({
  server: {
    handlers: {
      GET: ({ request }) => withCronAuth(request, runConteudosPublishDueCron),
    },
  },
});
