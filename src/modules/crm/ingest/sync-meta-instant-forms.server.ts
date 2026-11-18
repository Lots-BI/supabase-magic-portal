import type { SupabaseClient } from "@supabase/supabase-js";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import {
  ensureMetaAppLeadgenSubscription,
  ensurePageLeadgenSubscription,
  fetchMetaFormName,
  fetchMetaLead,
  listFormLeads,
  listPageLeadgenForms,
} from "./meta-lead-graph.server";
import {
  graphId,
  MetaLeadRetryError,
  MetaLeadSkipError,
  parseLeadCreatedAt,
  redactMetaError,
  type MetaLeadRecord,
} from "./meta-instant-form";
import { markLeadAdsCollector, saveMetaInstantLead } from "./persist-meta-instant-form.server";
import { resolveMetaPageAccessToken } from "./resolve-meta-page-token.server";
import type { MetaWebhookEvent } from "./meta-webhook";

const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

function isRecentLead(lead: MetaLeadRecord): boolean {
  const created = Date.parse(parseLeadCreatedAt(lead.createdTime));
  return Number.isFinite(created) && created >= Date.now() - LOOKBACK_MS;
}

export async function ingestMetaLeadgenEvent(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  event: MetaWebhookEvent,
): Promise<boolean> {
  const leadId = graphId(event.payload.leadgen_id) ?? graphId(event.externalId);
  if (!leadId) return false;
  const pageId = graphId(event.payload.page_id) ?? event.entryId ?? null;
  const http = new FetchHttpClient();
  const access = await resolveMetaPageAccessToken(supabase, cadastroClienteId, pageId);
  try {
    await ensurePageLeadgenSubscription(
      http,
      access.accessToken,
      access.pageId,
      process.env.META_APP_ID?.trim(),
    );
  } catch (error) {
    if (error instanceof MetaLeadRetryError) throw error;
  }
  const lead = await fetchMetaLead(http, access.accessToken, leadId);
  lead.pageId ??= pageId;
  lead.formId ??= graphId(event.payload.form_id);
  lead.adId ??= graphId(event.payload.ad_id) ?? graphId(event.payload.adgroup_id);
  const created = event.payload.created_time;
  if ((typeof created === "string" || typeof created === "number") && lead.createdTime == null) {
    lead.createdTime = created;
  }
  if (lead.formId && !lead.formName) {
    lead.formName = await fetchMetaFormName(http, access.accessToken, lead.formId);
  }
  await saveMetaInstantLead(supabase, cadastroClienteId, lead);
  await markLeadAdsCollector(supabase, cadastroClienteId, "live");
  return true;
}

/** Rede de segurança: leads recentes da Página, além do webhook. */
export async function syncMetaInstantFormsForCadastro(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<{ ok: boolean; saved: number; detail: string }> {
  const http = new FetchHttpClient();
  try {
    await ensureMetaAppLeadgenSubscription(http);
  } catch (error) {
    console.error(
      "[crm-leadgen]",
      redactMetaError(error instanceof Error ? error.message : "assinatura do app"),
    );
  }

  let access: { accessToken: string; pageId: string };
  try {
    access = await resolveMetaPageAccessToken(supabase, cadastroClienteId, null);
  } catch (error) {
    if (error instanceof MetaLeadSkipError) {
      await markLeadAdsCollector(supabase, cadastroClienteId, "scope_missing", error.message);
      return { ok: false, saved: 0, detail: error.message };
    }
    throw error;
  }

  try {
    await ensurePageLeadgenSubscription(
      http,
      access.accessToken,
      access.pageId,
      process.env.META_APP_ID?.trim(),
    );
  } catch (error) {
    if (!(error instanceof MetaLeadRetryError)) {
      console.error(
        "[crm-leadgen]",
        redactMetaError(error instanceof Error ? error.message : "assinatura da página"),
      );
    }
  }

  let forms;
  try {
    forms = await listPageLeadgenForms(http, access.accessToken, access.pageId);
  } catch (error) {
    if (error instanceof MetaLeadSkipError) {
      await markLeadAdsCollector(supabase, cadastroClienteId, "scope_missing", error.message);
      return { ok: false, saved: 0, detail: error.message };
    }
    throw error;
  }

  let saved = 0;
  let blocked: string | null = null;
  for (const form of forms) {
    const status = (form.status ?? "").toUpperCase();
    if (status && status !== "ACTIVE") continue;
    try {
      const leads = await listFormLeads(http, access.accessToken, form);
      for (const lead of leads) {
        if (!isRecentLead(lead)) continue;
        const result = await saveMetaInstantLead(supabase, cadastroClienteId, lead);
        if (!result.deduped) saved += 1;
      }
    } catch (error) {
      if (error instanceof MetaLeadSkipError) {
        blocked = error.message;
        break;
      }
      throw error;
    }
  }

  if (blocked && saved === 0) {
    await markLeadAdsCollector(supabase, cadastroClienteId, "scope_missing", blocked);
    return { ok: false, saved: 0, detail: blocked };
  }

  await markLeadAdsCollector(supabase, cadastroClienteId, "live");
  return { ok: true, saved, detail: "Formulário instantâneo da Meta ligado." };
}
