import { normalizeIdentityValue, normalizeUsername } from "../normalize-identity";

export type FormSubmitInput = {
  nome: string;
  email?: string | null;
  instagram?: string | null;
  telefone?: string | null;
  mensagem?: string | null;
  pageUrl?: string | null;
  formKey?: string | null;
  externalId?: string | null;
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export function asFormRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const raw = obj[key];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (value) return value;
  }
  return null;
}

function isValidEmail(value: string): boolean {
  return value.length > 3 && value.includes("@") && !value.includes(" ");
}

/** Aceita o payload amigável da landing (PT/EN snake/camel). */
export function parseFormSubmitBody(body: unknown): FormSubmitInput | { error: string } {
  const rec = asFormRecord(body);
  if (!rec) return { error: "JSON inválido." };

  const nome = pickString(rec, "nome", "name", "full_name", "fullName");
  if (!nome) return { error: "nome é obrigatório." };

  const emailRaw = pickString(rec, "email");
  const instagramRaw = pickString(rec, "instagram", "ig", "instagram_username");
  const telefoneRaw = pickString(rec, "telefone", "phone", "whatsapp");

  const email = emailRaw ? emailRaw.toLowerCase() : null;
  if (email && !isValidEmail(email)) return { error: "email inválido." };

  const instagram = normalizeUsername(instagramRaw);
  const telefone = telefoneRaw ? normalizeIdentityValue("phone", telefoneRaw) : null;

  if (!email && !instagram && !telefone) {
    return { error: "Informe pelo menos um contato: email, instagram ou telefone." };
  }

  const formKey = pickString(rec, "form_key", "formKey", "landing_key", "landingKey") ?? "default";
  if (formKey.length > 80) return { error: "form_key muito longo (máx. 80)." };

  return {
    nome,
    email,
    instagram,
    telefone,
    mensagem: pickString(rec, "mensagem", "message", "body"),
    pageUrl: pickString(rec, "page_url", "pageUrl", "url"),
    formKey,
    externalId: pickString(rec, "external_id", "externalId"),
    source: pickString(rec, "source") ?? "landing",
    utmSource: pickString(rec, "utm_source", "utmSource"),
    utmMedium: pickString(rec, "utm_medium", "utmMedium"),
    utmCampaign: pickString(rec, "utm_campaign", "utmCampaign"),
    utmContent: pickString(rec, "utm_content", "utmContent"),
    utmTerm: pickString(rec, "utm_term", "utmTerm"),
  };
}
