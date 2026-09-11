import { createError, defineEventHandler, getHeader, readRawBody } from "h3";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMetaSignature } from "@/modules/crm/ingest/meta-webhook";
import {
  ingestMetaWebhookPayload,
  ingestWhatsappWebhookPayload,
} from "@/modules/crm/ingest/ingest-meta-webhook.server";

/** Callback Meta / WhatsApp — HMAC + ingest fail-soft. Sem produto se o object for desconhecido. */
export default defineEventHandler(async (event) => {
  const raw = (await readRawBody(event)) ?? "";
  const signature = getHeader(event, "x-hub-signature-256");
  if (!verifyMetaSignature(raw, signature, process.env.META_APP_SECRET)) {
    throw createError({ statusCode: 401, statusMessage: "Invalid signature" });
  }

  let json: unknown = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid JSON" });
  }

  const supabase = getSupabaseAdmin();
  const object =
    json && typeof json === "object" ? (json as { object?: string }).object : undefined;

  try {
    if (object === "whatsapp_business_account") {
      const result = await ingestWhatsappWebhookPayload(supabase, json);
      return { ok: true, ...result };
    }
    const result = await ingestMetaWebhookPayload(supabase, json);
    return { ok: true, ...result };
  } catch (error) {
    console.error("[crm-webhook]", error);
    return { ok: true, ingested: 0, error: true };
  }
});
