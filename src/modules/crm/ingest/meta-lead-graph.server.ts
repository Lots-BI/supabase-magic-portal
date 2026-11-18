import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import { HttpClientError } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import {
  classifyMetaGraphFailure,
  MetaLeadRetryError,
  MetaLeadSkipError,
  parseGraphLead,
  parseLeadgenFormList,
  parseLeadList,
  redactMetaError,
  type LeadgenFormSummary,
  type MetaLeadRecord,
} from "./meta-instant-form";

const GRAPH_VERSION = "v22.0";

const LEAD_FIELDS_FULL =
  "id,created_time,field_data,form_id,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform,is_organic";

const LEAD_FIELDS_REDUCED = "id,created_time,field_data,form_id,ad_id";

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${path.replace(/^\//, "")}`;
}

function throwClassified(error: unknown): never {
  if (error instanceof MetaLeadRetryError || error instanceof MetaLeadSkipError) throw error;
  if (error instanceof HttpClientError) {
    const body = `${error.message}\n${error.body ?? ""}`;
    const kind = classifyMetaGraphFailure(error.status, body);
    const message = redactMetaError(error.message);
    if (kind === "retry") throw new MetaLeadRetryError(message);
    throw new MetaLeadSkipError(message);
  }
  const message = error instanceof Error ? error.message : "Falha ao falar com a Meta.";
  if (/fetch failed|network|timeout/i.test(message)) {
    throw new MetaLeadRetryError(redactMetaError(message));
  }
  throw new MetaLeadRetryError(redactMetaError(message));
}

async function graphGet<T>(
  http: HttpClientPort,
  path: string,
  accessToken: string,
  search: Record<string, string | undefined> = {},
): Promise<T> {
  const response = await http.request(graphUrl(path), {
    searchParams: {
      access_token: accessToken,
      ...search,
    },
  });
  return response.json<T>();
}

export async function fetchMetaLead(
  http: HttpClientPort,
  accessToken: string,
  leadId: string,
): Promise<MetaLeadRecord> {
  const load = async (fields: string) => {
    const json = await graphGet<unknown>(http, leadId, accessToken, { fields });
    const lead = parseGraphLead(json);
    if (!lead) throw new MetaLeadSkipError("A Meta não devolveu o lead.");
    return lead;
  };
  try {
    return await load(LEAD_FIELDS_FULL);
  } catch (error) {
    if (
      error instanceof HttpClientError &&
      classifyMetaGraphFailure(error.status, `${error.message}\n${error.body ?? ""}`) === "field"
    ) {
      try {
        return await load(LEAD_FIELDS_REDUCED);
      } catch (retryError) {
        throwClassified(retryError);
      }
    }
    throwClassified(error);
  }
}

export async function fetchMetaFormName(
  http: HttpClientPort,
  accessToken: string,
  formId: string,
): Promise<string | null> {
  try {
    const json = await graphGet<{ name?: string }>(http, formId, accessToken, { fields: "name" });
    return typeof json.name === "string" && json.name.trim() ? json.name.trim() : null;
  } catch {
    return null;
  }
}

export async function listPageLeadgenForms(
  http: HttpClientPort,
  accessToken: string,
  pageId: string,
): Promise<LeadgenFormSummary[]> {
  try {
    const json = await graphGet<unknown>(http, `${pageId}/leadgen_forms`, accessToken, {
      fields: "id,name,status",
      limit: "8",
    });
    return parseLeadgenFormList(json).slice(0, 8);
  } catch (error) {
    throwClassified(error);
  }
}

export async function listFormLeads(
  http: HttpClientPort,
  accessToken: string,
  form: LeadgenFormSummary,
): Promise<MetaLeadRecord[]> {
  const load = async (fields: string) => {
    const json = await graphGet<unknown>(http, `${form.id}/leads`, accessToken, {
      fields,
      limit: "25",
    });
    return parseLeadList(json, form).slice(0, 25);
  };
  try {
    return await load(LEAD_FIELDS_FULL);
  } catch (error) {
    if (
      error instanceof HttpClientError &&
      classifyMetaGraphFailure(error.status, `${error.message}\n${error.body ?? ""}`) === "field"
    ) {
      try {
        return await load(LEAD_FIELDS_REDUCED);
      } catch (retryError) {
        throwClassified(retryError);
      }
    }
    throwClassified(error);
  }
}

type SubscribedApp = { id?: string; subscribed_fields?: string[] };

/** Assina `leadgen` na Página sem apagar os outros campos já assinados. */
export async function ensurePageLeadgenSubscription(
  http: HttpClientPort,
  pageAccessToken: string,
  pageId: string,
  appId: string | undefined,
): Promise<"already" | "subscribed" | "skipped"> {
  let fields: string[] = [];
  try {
    const json = await graphGet<{ data?: SubscribedApp[] }>(
      http,
      `${pageId}/subscribed_apps`,
      pageAccessToken,
    );
    const rows = json.data ?? [];
    const mine = appId
      ? rows.find((row) => row.id === appId)
      : rows.length === 1
        ? rows[0]
        : undefined;
    if (!appId && rows.length > 1) return "skipped";
    if (mine) {
      fields = (mine.subscribed_fields ?? []).filter((field) => field.trim());
      if (fields.includes("leadgen")) return "already";
    }
  } catch {
    return "skipped";
  }
  const next = [...new Set([...fields, "leadgen"])];
  try {
    await http.request(graphUrl(`${pageId}/subscribed_apps`), {
      method: "POST",
      searchParams: {
        access_token: pageAccessToken,
        subscribed_fields: next.join(","),
      },
    });
    return "subscribed";
  } catch (error) {
    if (error instanceof HttpClientError) {
      const kind = classifyMetaGraphFailure(error.status, `${error.message}\n${error.body ?? ""}`);
      if (kind === "retry") throw new MetaLeadRetryError(redactMetaError(error.message));
    }
    return "skipped";
  }
}

function subscriptionFieldNames(fields: unknown): string[] {
  if (!Array.isArray(fields)) return [];
  return fields.flatMap((field) => {
    if (typeof field === "string" && field.trim()) return [field.trim()];
    if (field && typeof field === "object" && "name" in field) {
      const name = (field as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) return [name.trim()];
    }
    return [];
  });
}

let appLeadgenChecked = false;

/**
 * Inclui `leadgen` na assinatura Page do app, preservando a callback que já
 * aponta para o Lots em produção. Não roda fora da Vercel, salvo
 * `META_LEADGEN_SUBSCRIBE=1`.
 */
export async function ensureMetaAppLeadgenSubscription(
  http: HttpClientPort,
): Promise<"ok" | "updated" | "skipped"> {
  if (appLeadgenChecked) return "ok";
  const allow = process.env.VERCEL === "1" || process.env.META_LEADGEN_SUBSCRIBE === "1";
  if (!allow) return "skipped";
  const appId = process.env.META_APP_ID?.trim();
  const secret = process.env.META_APP_SECRET?.trim();
  const verify = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!appId || !secret || !verify) return "skipped";

  const appToken = `${appId}|${secret}`;
  let subscriptions: {
    object?: string;
    callback_url?: string;
    fields?: unknown;
  }[] = [];
  try {
    const json = await graphGet<{ data?: typeof subscriptions }>(
      http,
      `${appId}/subscriptions`,
      appToken,
    );
    subscriptions = json.data ?? [];
  } catch {
    return "skipped";
  }

  const page = subscriptions.find((row) => row.object === "page");
  const instagram = subscriptions.find((row) => row.object === "instagram");
  const callback = page?.callback_url || instagram?.callback_url || "";
  if (!callback.includes("lotsbi.leandromajr.com")) {
    appLeadgenChecked = true;
    return "skipped";
  }
  const fields = new Set(subscriptionFieldNames(page?.fields));
  if (fields.has("leadgen")) {
    appLeadgenChecked = true;
    return "ok";
  }
  fields.add("leadgen");
  try {
    await http.request(graphUrl(`${appId}/subscriptions`), {
      method: "POST",
      searchParams: {
        access_token: appToken,
        object: "page",
        callback_url: callback,
        verify_token: verify,
        fields: [...fields].join(","),
      },
    });
    appLeadgenChecked = true;
    return "updated";
  } catch {
    return "skipped";
  }
}
