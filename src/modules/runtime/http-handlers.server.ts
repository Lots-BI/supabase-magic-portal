import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ingestMetaWebhookPayload,
  ingestWhatsappWebhookPayload,
} from "@/modules/crm/ingest/ingest-meta-webhook.server";
import { verifyMetaSignature, verifySubscribeQuery } from "@/modules/crm/ingest/meta-webhook";
import {
  CrmIngestAuthError,
  CrmIngestPayloadError,
  ingestCrmApiPayload,
} from "@/modules/crm/ingest/ingest-api.server";
import { jsonResponse } from "./http";

export function handleMetaWebhookGet(request: Request): Response {
  const url = new URL(request.url);
  const result = verifySubscribeQuery(
    {
      "hub.mode": url.searchParams.get("hub.mode") ?? undefined,
      "hub.verify_token": url.searchParams.get("hub.verify_token") ?? undefined,
      "hub.challenge": url.searchParams.get("hub.challenge") ?? undefined,
    },
    process.env.META_WEBHOOK_VERIFY_TOKEN,
  );
  if (!result.ok) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(result.challenge, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function handleMetaWebhookPost(request: Request): Promise<Response> {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? undefined;
  if (!verifyMetaSignature(raw, signature, process.env.META_APP_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }
  let json: unknown = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const object =
    json && typeof json === "object" ? (json as { object?: string }).object : undefined;
  try {
    if (object === "whatsapp_business_account") {
      return jsonResponse({ ok: true, ...(await ingestWhatsappWebhookPayload(supabase, json)) });
    }
    return jsonResponse({ ok: true, ...(await ingestMetaWebhookPayload(supabase, json)) });
  } catch (error) {
    console.error("[crm-webhook]", error);
    return jsonResponse({ ok: true, ingested: 0, error: true });
  }
}

export async function handleCrmIngestPost(request: Request): Promise<Response> {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!bearer) return jsonResponse({ error: "Missing bearer token" }, 401);
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  try {
    return jsonResponse(await ingestCrmApiPayload(getSupabaseAdmin(), bearer, body));
  } catch (error) {
    if (error instanceof CrmIngestAuthError) {
      return jsonResponse({ error: error.message }, 401);
    }
    if (error instanceof CrmIngestPayloadError) {
      return jsonResponse({ error: error.message }, 400);
    }
    console.error("[crm-ingest]", error);
    return jsonResponse({ error: "Ingest failed" }, 500);
  }
}
