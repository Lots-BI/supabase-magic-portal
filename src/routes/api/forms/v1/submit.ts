import { createFileRoute } from "@tanstack/react-router";
import { handleFormSubmitPost } from "@/modules/runtime/http-handlers.server";

export const Route = createFileRoute("/api/forms/v1/submit")({
  server: {
    handlers: {
      POST: ({ request }) => handleFormSubmitPost(request),
    },
  },
});
