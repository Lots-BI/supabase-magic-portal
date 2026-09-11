import { createError, defineEventHandler, getHeader, readBody } from "h3";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CrmIngestAuthError,
  CrmIngestPayloadError,
  ingestCrmApiPayload,
} from "@/modules/crm/ingest/ingest-api.server";

/**
 * Ingestão CRM — ManyChat / n8n / Typeform / site.
 * Auth: Authorization: Bearer <token>. Vite local 404 em /api/*; existe em Vercel.
 */
export default defineEventHandler(async (event) => {
  const header = getHeader(event, "authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!bearer) {
    throw createError({ statusCode: 401, statusMessage: "Missing bearer token" });
  }

  let body: unknown = {};
  try {
    body = await readBody(event);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid JSON" });
  }

  try {
    return await ingestCrmApiPayload(getSupabaseAdmin(), bearer, body);
  } catch (error) {
    if (error instanceof CrmIngestAuthError) {
      throw createError({ statusCode: 401, statusMessage: error.message });
    }
    if (error instanceof CrmIngestPayloadError) {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    console.error("[crm-ingest]", error);
    throw createError({ statusCode: 500, statusMessage: "Ingest failed" });
  }
});
