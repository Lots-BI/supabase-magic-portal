import type { SupabaseClient } from "@supabase/supabase-js";
import { persistCrmSignal } from "./persist-signal.server";
import { parseMetaWebhookBody, type MetaWebhookEvent } from "./meta-webhook";
import { mapGraphCommentToSignal } from "./map-graph-comment";
import { mapGraphDmToSignal } from "./map-graph-dm";
import { mapLeadForm } from "./map-lead-form";
import { mapWhatsappInbound } from "./map-whatsapp";
import { shouldSkipComment } from "../skip-rules";
import type { CrmGraphComment } from "../types";

async function claimReceipt(
  supabase: SupabaseClient,
  provider: string,
  externalId: string,
  field: string,
  cadastroClienteId: number | null,
): Promise<boolean> {
  const { error } = await supabase.from("crm_webhook_receipts").insert({
    provider,
    external_id: externalId,
    field,
    cadastro_cliente_id: cadastroClienteId,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

async function resolveCadastroByExternalId(
  supabase: SupabaseClient,
  externalId: string,
): Promise<number | null> {
  if (!externalId) return null;
  const { data } = await supabase
    .from("ph_identities")
    .select("connection_id")
    .eq("external_id", externalId)
    .limit(8);
  const connectionIds = [...new Set((data ?? []).map((row) => row.connection_id).filter(Boolean))];
  if (connectionIds.length === 0) return null;
  const { data: connections } = await supabase
    .from("ph_connections")
    .select("cadastro_id")
    .in("id", connectionIds);
  const cadastro = connections?.find((row) => row.cadastro_id != null)?.cadastro_id;
  return typeof cadastro === "number" ? cadastro : null;
}

async function resolveMediaUuid(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  graphMediaId: string | null,
): Promise<{ id: string; mediaProductType: string | null; permalink: string | null } | null> {
  if (!graphMediaId) return null;
  const { data } = await supabase
    .from("ig_media")
    .select("id, media_product_type, permalink")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .eq("ig_media_id", graphMediaId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    mediaProductType: data.media_product_type,
    permalink: data.permalink,
  };
}

function commentFromPayload(payload: Record<string, unknown>): CrmGraphComment | null {
  const id = typeof payload.id === "string" ? payload.id : null;
  if (!id) return null;
  const from = payload.from && typeof payload.from === "object" ? (payload.from as Record<string, unknown>) : {};
  return {
    id,
    text: typeof payload.text === "string" ? payload.text : null,
    timestamp: typeof payload.timestamp === "string" ? payload.timestamp : null,
    username: typeof from.username === "string" ? from.username : null,
    from: {
      id: typeof from.id === "string" ? from.id : undefined,
      username: typeof from.username === "string" ? from.username : undefined,
    },
    parent_id: typeof payload.parent_id === "string" ? payload.parent_id : undefined,
    hidden: payload.hidden === true,
  };
}

export async function ingestMetaWebhookPayload(
  supabase: SupabaseClient,
  json: unknown,
): Promise<{ accepted: number; skipped: number; ingested: number }> {
  const events = parseMetaWebhookBody(json);
  let accepted = 0;
  let skipped = 0;
  let ingested = 0;

  for (const event of events) {
    const cadastroClienteId = await resolveCadastroByExternalId(supabase, event.entryId);
    const claimed = await claimReceipt(
      supabase,
      "meta",
      event.externalId,
      event.field,
      cadastroClienteId,
    );
    if (!claimed) {
      skipped += 1;
      continue;
    }
    accepted += 1;
    if (!cadastroClienteId) continue;
    const did = await ingestOneEvent(supabase, cadastroClienteId, event);
    if (did) ingested += 1;
  }

  return { accepted, skipped, ingested };
}

async function ingestOneEvent(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  event: MetaWebhookEvent,
): Promise<boolean> {
  if (event.field === "comments" || event.field === "mentions") {
    const comment = commentFromPayload(event.payload);
    if (!comment || shouldSkipComment(comment, null)) return false;
    const graphMediaId =
      typeof event.payload.media === "object" && event.payload.media
        ? String((event.payload.media as { id?: string }).id ?? "")
        : null;
    const media = await resolveMediaUuid(supabase, cadastroClienteId, graphMediaId);
    const mapped = mapGraphCommentToSignal(comment, {
      igMediaId: media?.id ?? "",
      mediaProductType: media?.mediaProductType,
      permalink: media?.permalink,
    });
    if (!media) mapped.igMediaId = null;
    if (event.field === "mentions") {
      mapped.kind = "mention";
      mapped.source = "instagram_mention";
    }
    const username = comment.username ?? comment.from?.username ?? null;
    const igsid = comment.from?.id ?? null;
    await persistCrmSignal(
      supabase,
      cadastroClienteId,
      mapped,
      [
        ...(igsid ? [{ kind: "igsid" as const, value: igsid, source: mapped.source }] : []),
        ...(username
          ? [{ kind: "ig_username" as const, value: username, source: mapped.source }]
          : []),
      ],
      username ? `@${username}` : event.field === "mentions" ? "Menção" : "Comentário",
    );
    return true;
  }

  if (event.field === "messages") {
    const sender =
      event.payload.sender && typeof event.payload.sender === "object"
        ? (event.payload.sender as Record<string, unknown>)
        : event.payload.from && typeof event.payload.from === "object"
          ? (event.payload.from as Record<string, unknown>)
          : {};
    const message =
      event.payload.message && typeof event.payload.message === "object"
        ? (event.payload.message as Record<string, unknown>)
        : {};
    const mapped = mapGraphDmToSignal({
      id: event.externalId,
      text: typeof message.text === "string" ? message.text : null,
      timestamp:
        typeof event.payload.timestamp === "string" || typeof event.payload.timestamp === "number"
          ? new Date(Number(event.payload.timestamp) * (String(event.payload.timestamp).length < 12 ? 1000 : 1)).toISOString()
          : new Date().toISOString(),
      from: {
        id: typeof sender.id === "string" ? sender.id : undefined,
        username: typeof sender.username === "string" ? sender.username : undefined,
      },
    });
    if (!mapped) return false;
    await persistCrmSignal(
      supabase,
      cadastroClienteId,
      mapped.signal,
      mapped.identities,
      mapped.displayName,
    );
    await supabase.from("crm_collector_state").upsert(
      {
        cadastro_cliente_id: cadastroClienteId,
        collector_key: "dm",
        status: "live",
        detail: "Webhook Direct recebido.",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cadastro_cliente_id,collector_key" },
    );
    return true;
  }

  if (event.field === "leadgen") {
    const leadId =
      typeof event.payload.leadgen_id === "string" ? event.payload.leadgen_id : event.externalId;
    const mapped = mapLeadForm({
      id: leadId,
      createdTime: new Date().toISOString(),
      fieldData: [],
    });
    if (!mapped) return false;
    await persistCrmSignal(
      supabase,
      cadastroClienteId,
      mapped.signal,
      mapped.identities,
      mapped.displayName,
      mapped.facts,
    );
    await supabase.from("crm_collector_state").upsert(
      {
        cadastro_cliente_id: cadastroClienteId,
        collector_key: "lead_ads",
        status: "live",
        detail: "Webhook Lead Ads recebido. Campos chegam no Graph fetch do lead.",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cadastro_cliente_id,collector_key" },
    );
    return true;
  }

  if (event.object === "whatsapp_business_account" || event.field === "messages") {
    return false;
  }

  return false;
}

export async function ingestWhatsappWebhookPayload(
  supabase: SupabaseClient,
  json: unknown,
): Promise<{ ingested: number }> {
  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  if (!root || root.object !== "whatsapp_business_account") return { ingested: 0 };
  const events = parseMetaWebhookBody(json);
  let ingested = 0;
  for (const event of events) {
    const cadastroClienteId = await resolveCadastroByExternalId(supabase, event.entryId);
    const claimed = await claimReceipt(supabase, "whatsapp", event.externalId, event.field, cadastroClienteId);
    if (!claimed || !cadastroClienteId) continue;
    const contacts = Array.isArray((event.payload as { contacts?: unknown }).contacts)
      ? ((event.payload as { contacts: { wa_id?: string }[] }).contacts)
      : [];
    const waId = contacts[0]?.wa_id;
    const mapped = mapWhatsappInbound({
      messageId: event.externalId,
      waId: waId ?? "",
      text:
        event.payload.message && typeof event.payload.message === "object"
          ? String((event.payload.message as { text?: { body?: string } }).text?.body ?? "")
          : null,
    });
    if (!mapped) continue;
    await persistCrmSignal(
      supabase,
      cadastroClienteId,
      mapped.signal,
      mapped.identities,
      mapped.displayName,
      mapped.facts,
    );
    ingested += 1;
  }
  return { ingested };
}
