import { createError, defineEventHandler, getHeader, readBody } from "h3";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CrmIngestAuthError,
  CrmIngestPayloadError,
  submitFormToCrm,
} from "@/modules/crm/ingest/submit-form.server";

/**
 * Formulário de landing → CRM + `forms`.
 * Auth: Authorization: Bearer lots_crm_… (token por cliente no CRM).
 * A landing NÃO usa chave Supabase — só este endpoint via server da landing.
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
    return await submitFormToCrm(getSupabaseAdmin(), bearer, body);
  } catch (error) {
    if (error instanceof CrmIngestAuthError) {
      throw createError({ statusCode: 401, statusMessage: error.message });
    }
    if (error instanceof CrmIngestPayloadError) {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    console.error("[forms-submit]", error);
    throw createError({ statusCode: 500, statusMessage: "Form submit failed" });
  }
});
