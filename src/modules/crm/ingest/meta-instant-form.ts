import { normalizeIdentityValue, normalizeUsername } from "../normalize-identity";

/** `form_key` estável — o mesmo papel de `landing-lotsbi` para a landing. */
export const META_INSTANT_FORM_KEY = "meta-instant";

/** `forms.source` dos formulários instantâneos de campanha (Lead Ads). */
export const META_INSTANT_FORM_SOURCE = "meta_instant_form";

export type FormOrigin = "landing" | "meta_instant" | "other";

export class MetaLeadRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaLeadRetryError";
  }
}

/** Falha permanente (permissão, página sem token). A Meta não precisa reenviar. */
export class MetaLeadSkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaLeadSkipError";
  }
}

export type LeadFieldInput = { name?: string | null; values?: string[] | null };

export type MetaLeadRecord = {
  id: string;
  createdTime?: string | number | null;
  formId?: string | null;
  formName?: string | null;
  adId?: string | null;
  adName?: string | null;
  adsetId?: string | null;
  adsetName?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  pageId?: string | null;
  platform?: string | null;
  isOrganic?: boolean | null;
  fieldData?: LeadFieldInput[] | null;
};

export type ExtractedLeadFields = {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  address: string | null;
  custom: { label: string; value: string }[];
};

const EMAIL_KEYS = new Set(["email", "e_mail", "email_address"]);
const PHONE_KEYS = new Set([
  "phone",
  "phone_number",
  "telefone",
  "celular",
  "whatsapp",
  "mobile_phone",
  "mobile",
]);
const FULL_NAME_KEYS = new Set(["full_name", "nome", "name"]);
const FIRST_NAME_KEYS = new Set(["first_name", "primeiro_nome"]);
const LAST_NAME_KEYS = new Set(["last_name", "sobrenome"]);
const ADDRESS_KEYS = new Set([
  "street_address",
  "city",
  "state",
  "zip",
  "zip_code",
  "post_code",
  "country",
  "address",
  "endereco",
  "cidade",
]);

export function graphId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  return null;
}

export function redactMetaError(message: string): string {
  return message.replace(/access_token=[^&\s]+/gi, "access_token=***").slice(0, 300);
}

export function classifyMetaGraphFailure(status: number, body: string): "retry" | "skip" | "field" {
  const text = body.toLowerCase();
  if (status === 429 || status >= 500 || status === 0) return "retry";
  if (/fetch failed|network|econnreset|timeout|temporar/.test(text)) return "retry";
  if (status === 400 && /unknown field|nonexisting field/.test(text)) return "field";
  if (
    status === 401 ||
    status === 403 ||
    /leads_retrieval|\(#200\)|\(#10\)|\(#190\)|permission|access token|oauth/.test(text)
  ) {
    return "skip";
  }
  if (status >= 400) return "skip";
  return "retry";
}

export function foldLeadFieldName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstValue(values: string[] | null | undefined): string | null {
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function isInstagramKey(key: string): boolean {
  return key === "ig" || key === "ig_username" || key.includes("instagram");
}

function instagramFromValue(raw: string): string | null {
  const url = raw.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const candidate = (url?.[1] ?? raw.replace(/^@+/, "").split(/\s+/)[0] ?? "").trim();
  if (!/^[A-Za-z0-9._]{2,30}$/.test(candidate)) return null;
  return normalizeUsername(candidate);
}

function phoneFromValue(raw: string): string | null {
  const phone = normalizeIdentityValue("phone", raw);
  if (!phone || phone.replace(/\D/g, "").length < 8) return null;
  return phone;
}

function emailFromValue(raw: string): string | null {
  const email = normalizeIdentityValue("email", raw);
  if (!email || !email.includes("@") || email.includes(" ")) return null;
  return email;
}

/** Só campos estruturados viram e-mail, telefone ou @. Texto livre fica na mensagem. */
export function extractLeadFields(
  fieldData: LeadFieldInput[] | null | undefined,
): ExtractedLeadFields {
  let email: string | null = null;
  let telefone: string | null = null;
  let instagram: string | null = null;
  let fullName: string | null = null;
  let firstName: string | null = null;
  let lastName: string | null = null;
  const addressParts: string[] = [];
  const custom: { label: string; value: string }[] = [];

  for (const field of fieldData ?? []) {
    const label = (field.name ?? "").trim();
    const key = foldLeadFieldName(label);
    const value = firstValue(field.values ?? null);
    if (!key || !value) continue;

    if (EMAIL_KEYS.has(key)) {
      email ??= emailFromValue(value);
      continue;
    }
    if (PHONE_KEYS.has(key)) {
      telefone ??= phoneFromValue(value);
      continue;
    }
    if (isInstagramKey(key)) {
      instagram ??= instagramFromValue(value);
      continue;
    }
    if (FULL_NAME_KEYS.has(key)) {
      fullName ??= value.slice(0, 200);
      continue;
    }
    if (FIRST_NAME_KEYS.has(key)) {
      firstName ??= value.slice(0, 80);
      continue;
    }
    if (LAST_NAME_KEYS.has(key)) {
      lastName ??= value.slice(0, 80);
      continue;
    }
    if (ADDRESS_KEYS.has(key)) {
      addressParts.push(value.slice(0, 120));
      continue;
    }
    if (custom.length < 20) custom.push({ label: label.slice(0, 120), value: value.slice(0, 500) });
  }

  const nome = fullName || [firstName, lastName].filter(Boolean).join(" ") || null;
  return {
    nome,
    email,
    telefone,
    instagram,
    address: addressParts.length > 0 ? addressParts.join(", ").slice(0, 300) : null,
    custom,
  };
}

export function leadAnswersText(extracted: ExtractedLeadFields): string | null {
  const lines = [
    ...extracted.custom.map((item) => `${item.label}: ${item.value}`),
    extracted.address ? `Endereço: ${extracted.address}` : null,
  ].filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;
  return lines.join("\n").slice(0, 4000);
}

export function parseLeadCreatedAt(raw: string | number | null | undefined): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim().replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    if (/^\d+$/.test(trimmed)) return parseLeadCreatedAt(Number(trimmed));
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function clip(value: string | null | undefined, max = 300): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function metaPlatformMedium(platform: string | null | undefined): string {
  const value = (platform ?? "").trim().toLowerCase();
  if (value === "ig" || value === "instagram") return "instagram";
  if (value === "fb" || value === "facebook") return "facebook";
  if (value === "an" || value === "audience_network") return "audience_network";
  if (value) return value.slice(0, 40);
  return "instant_form";
}

export function metaPlatformLabel(medium: string | null | undefined): string | null {
  if (!medium) return null;
  if (medium === "instagram") return "Instagram";
  if (medium === "facebook") return "Facebook";
  if (medium === "audience_network") return "Audience Network";
  if (medium === "instant_form") return "Meta";
  return medium;
}

export type InstantFormRow = {
  nome: string;
  email: string | null;
  instagram: string | null;
  telefone: string | null;
  mensagem: string | null;
  formKey: typeof META_INSTANT_FORM_KEY;
  source: typeof META_INSTANT_FORM_SOURCE;
  externalId: string;
  utmSource: "meta";
  utmMedium: string;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  createdAt: string;
  payload: {
    leadgen_id: string;
    form_id: string | null;
    form_name: string | null;
    page_id: string | null;
    ad_id: string | null;
    ad_name: string | null;
    adset_id: string | null;
    adset_name: string | null;
    campaign_id: string | null;
    campaign_name: string | null;
    platform: string | null;
    is_organic: boolean;
    field_names: string[];
  };
};

export function mapInstantFormSubmission(lead: MetaLeadRecord): InstantFormRow | null {
  if (!lead.id) return null;
  const extracted = extractLeadFields(lead.fieldData);
  return {
    nome: (extracted.nome ?? "Lead").slice(0, 200),
    email: extracted.email,
    instagram: extracted.instagram,
    telefone: extracted.telefone,
    mensagem: leadAnswersText(extracted),
    formKey: META_INSTANT_FORM_KEY,
    source: META_INSTANT_FORM_SOURCE,
    externalId: lead.id.slice(0, 200),
    utmSource: "meta",
    utmMedium: metaPlatformMedium(lead.platform),
    utmCampaign: clip(lead.campaignName) ?? clip(lead.campaignId),
    utmContent: clip(lead.adName) ?? clip(lead.adId),
    utmTerm: clip(lead.formName) ?? clip(lead.formId),
    createdAt: parseLeadCreatedAt(lead.createdTime),
    payload: {
      leadgen_id: lead.id,
      form_id: clip(lead.formId, 64),
      form_name: clip(lead.formName),
      page_id: clip(lead.pageId, 64),
      ad_id: clip(lead.adId, 64),
      ad_name: clip(lead.adName),
      adset_id: clip(lead.adsetId, 64),
      adset_name: clip(lead.adsetName),
      campaign_id: clip(lead.campaignId, 64),
      campaign_name: clip(lead.campaignName),
      platform: clip(lead.platform, 40),
      is_organic: lead.isOrganic === true,
      field_names: (lead.fieldData ?? [])
        .map((field) => (field.name ?? "").trim())
        .filter(Boolean)
        .slice(0, 40),
    },
  };
}

export function formOriginKind(source: string, formKey: string): FormOrigin {
  if (source === META_INSTANT_FORM_SOURCE || formKey === META_INSTANT_FORM_KEY)
    return "meta_instant";
  if (source === "landing" || formKey.startsWith("landing")) return "landing";
  return "other";
}

/** Tag da lista. Landing continua mostrando a chave (`landing-lotsbi`). */
export function formOriginBadge(source: string, formKey: string): string {
  const kind = formOriginKind(source, formKey);
  if (kind === "meta_instant") return "Formulário instantâneo";
  if (kind === "landing") return formKey || "Landing";
  return formKey || source || "Formulário";
}

export function formOriginLabel(source: string, formKey: string): string {
  const kind = formOriginKind(source, formKey);
  if (kind === "meta_instant") return "Formulário instantâneo";
  if (kind === "landing") return "Landing";
  return source || formKey || "Outra origem";
}

export function instantFormContextLine(
  utmCampaign: string | null,
  utmContent: string | null,
  utmTerm: string | null,
): string {
  if (utmCampaign) return `Campanha · ${utmCampaign}`;
  if (utmTerm) return `Formulário · ${utmTerm}`;
  if (utmContent) return `Anúncio · ${utmContent}`;
  return "Campanha da Meta";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseGraphLead(json: unknown): MetaLeadRecord | null {
  const rec = asRecord(json);
  if (!rec) return null;
  const id = graphId(rec.id);
  if (!id) return null;
  const fieldData = Array.isArray(rec.field_data)
    ? rec.field_data.flatMap((item) => {
        const field = asRecord(item);
        if (!field) return [];
        const values = Array.isArray(field.values)
          ? field.values.filter((value): value is string => typeof value === "string")
          : [];
        return [{ name: typeof field.name === "string" ? field.name : null, values }];
      })
    : [];
  return {
    id,
    createdTime:
      typeof rec.created_time === "string" || typeof rec.created_time === "number"
        ? rec.created_time
        : null,
    formId: graphId(rec.form_id),
    adId: graphId(rec.ad_id),
    adName: typeof rec.ad_name === "string" ? rec.ad_name : null,
    adsetId: graphId(rec.adset_id),
    adsetName: typeof rec.adset_name === "string" ? rec.adset_name : null,
    campaignId: graphId(rec.campaign_id),
    campaignName: typeof rec.campaign_name === "string" ? rec.campaign_name : null,
    platform: typeof rec.platform === "string" ? rec.platform : null,
    isOrganic: rec.is_organic === true,
    fieldData,
  };
}

export type LeadgenFormSummary = { id: string; name: string | null; status: string | null };

export function parseLeadgenFormList(json: unknown): LeadgenFormSummary[] {
  const rec = asRecord(json);
  const data = Array.isArray(rec?.data) ? rec.data : [];
  const forms: LeadgenFormSummary[] = [];
  for (const item of data) {
    const form = asRecord(item);
    const id = graphId(form?.id);
    if (!id) continue;
    forms.push({
      id,
      name: typeof form?.name === "string" ? form.name : null,
      status: typeof form?.status === "string" ? form.status : null,
    });
  }
  return forms;
}

export function parseLeadList(
  json: unknown,
  form: { id: string; name: string | null },
): MetaLeadRecord[] {
  const rec = asRecord(json);
  const data = Array.isArray(rec?.data) ? rec.data : [];
  const leads: MetaLeadRecord[] = [];
  for (const item of data) {
    const lead = parseGraphLead(item);
    if (!lead) continue;
    lead.formId ??= form.id;
    lead.formName ??= form.name;
    leads.push(lead);
  }
  return leads;
}

export function leadCollectorDetail(
  kind: "live" | "scope_missing" | "planned",
  raw?: string,
): string {
  if (kind === "live") return "Formulário instantâneo da Meta ligado.";
  if (kind === "planned") return "Conecte a Página da Meta deste cliente em Conexões.";
  if (raw && /leads_retrieval|permission|\(#200\)|\(#10\)/i.test(raw)) {
    return "A conexão Meta não tem permissão para formulário instantâneo (leads_retrieval, pages_manage_ads e pages_manage_metadata). Reconecte os anúncios em Conexões com META_REQUEST_LEADS_SCOPE=1.";
  }
  if (raw && !/^HTTP \d/.test(raw) && !/access_token/i.test(raw) && raw.length < 180) {
    return raw;
  }
  return "Não foi possível ler o formulário instantâneo na Meta. Reconecte a conta em Conexões.";
}
