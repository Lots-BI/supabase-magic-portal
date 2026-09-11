import { createFileRoute } from "@tanstack/react-router";
import { handleCrmIngestPost } from "@/modules/runtime/http-handlers.server";

export const Route = createFileRoute("/api/crm/v1/interactions")({
  server: {
    handlers: {
      POST: ({ request }) => handleCrmIngestPost(request),
    },
  },
});
