import { createFileRoute } from "@tanstack/react-router";
import { handleMetaWebhookGet, handleMetaWebhookPost } from "@/modules/runtime/http-handlers.server";

export const Route = createFileRoute("/api/webhooks/meta")({
  server: {
    handlers: {
      GET: ({ request }) => handleMetaWebhookGet(request),
      POST: ({ request }) => handleMetaWebhookPost(request),
    },
  },
});
