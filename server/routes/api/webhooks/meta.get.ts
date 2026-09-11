import { createError, defineEventHandler, getQuery, setResponseHeader } from "h3";
import { verifySubscribeQuery } from "@/modules/crm/ingest/meta-webhook";

/** Verificação do callback Meta (hub.mode=subscribe). */
export default defineEventHandler((event) => {
  const query = getQuery(event) as {
    "hub.mode"?: string;
    "hub.verify_token"?: string;
    "hub.challenge"?: string;
  };
  const result = verifySubscribeQuery(query, process.env.META_WEBHOOK_VERIFY_TOKEN);
  if (!result.ok) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
  return result.challenge;
});
