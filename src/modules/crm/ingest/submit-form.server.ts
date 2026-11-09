import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmFieldFactInput, CrmIdentityInput, CrmSignalInput } from "../types";
import {
  CrmIngestAuthError,
  CrmIngestPayloadError,
  resolveCrmIngestToken,
} from "./ingest-api.server";
import { persistCrmSignal } from "./persist-signal.server";
import { asFormRecord, parseFormSubmitBody, type FormSubmitInput } from "./parse-form-submit";

export type { FormSubmitInput } from "./parse-form-submit";
export { parseFormSubmitBody } from "./parse-form-submit";

export type FormSubmitResult = {
  ok: true;
  submissionId: string;
  personId: string;
  deduped: boolean;
};

function buildExternalId(input: FormSubmitInput): string {
  // Sem external_id = cada envio é novo (pessoa no CRM ainda faz stitch por e-mail/@/fone).
  if (input.externalId) return input.externalId.slice(0, 200);
  return `form_${randomUUID()}`;
}

function buildCrmMapping(
  cadastroClienteId: number,
  input: FormSubmitInput,
  externalId: string,
): {
  signal: CrmSignalInput;
  identities: CrmIdentityInput[];
  facts: CrmFieldFactInput[];
  displayName: string;
} {
  const source = `form:${input.formKey ?? "default"}`;
  const collectedAt = new Date().toISOString();
  const identities: CrmIdentityInput[] = [];
  const facts: CrmFieldFactInput[] = [];

  if (input.email) {
    identities.push({ kind: "email", value: input.email, source });
    facts.push({ field: "email", value: input.email, source, collectedAt });
  }
  if (input.instagram) {
    identities.push({ kind: "ig_username", value: input.instagram, source });
  }
  if (input.telefone) {
    identities.push({ kind: "phone", value: input.telefone, source });
    facts.push({ field: "phone", value: input.telefone, source, collectedAt });
  }
  facts.push({ field: "full_name", value: input.nome, source, collectedAt });

  const campaignParts = [input.utmCampaign, input.utmSource, input.utmMedium].filter(Boolean);
  const campaignKey = campaignParts.length > 0 ? campaignParts.join("|") : null;

  const bodyParts = [input.mensagem, input.pageUrl ? `page: ${input.pageUrl}` : null].filter(
    Boolean,
  );

  return {
    displayName: input.nome,
    identities,
    facts,
    signal: {
      kind: "form",
      place: "web",
      source,
      externalId,
      body: bodyParts.length > 0 ? bodyParts.join("\n") : null,
      occurredAt: collectedAt,
      campaignKey,
      payload: {
        cadastroClienteId,
        formKey: input.formKey,
        pageUrl: input.pageUrl,
        utm: {
          source: input.utmSource,
          medium: input.utmMedium,
          campaign: input.utmCampaign,
          content: input.utmContent,
          term: input.utmTerm,
        },
      },
    },
  };
}

export async function submitFormToCrm(
  supabase: SupabaseClient,
  bearerToken: string,
  body: unknown,
): Promise<FormSubmitResult> {
  const token = await resolveCrmIngestToken(supabase, bearerToken);
  const parsed = parseFormSubmitBody(body);
  if ("error" in parsed) throw new CrmIngestPayloadError(parsed.error);

  const formKey = parsed.formKey ?? "default";
  const externalId = buildExternalId(parsed);

  const { data: existing } = await supabase
    .from("forms")
    .select("id, crm_person_id")
    .eq("cadastro_cliente_id", token.cadastro_cliente_id)
    .eq("form_key", formKey)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing?.id) {
    return {
      ok: true,
      submissionId: existing.id,
      personId: existing.crm_person_id ?? "",
      deduped: true,
    };
  }

  const mapped = buildCrmMapping(token.cadastro_cliente_id, parsed, externalId);
  const { personId } = await persistCrmSignal(
    supabase,
    token.cadastro_cliente_id,
    mapped.signal,
    mapped.identities,
    mapped.displayName,
    mapped.facts,
  );

  const { data: row, error } = await supabase
    .from("forms")
    .insert({
      cadastro_cliente_id: token.cadastro_cliente_id,
      form_key: formKey,
      nome: parsed.nome,
      email: parsed.email,
      instagram: parsed.instagram,
      telefone: parsed.telefone,
      mensagem: parsed.mensagem,
      source: parsed.source ?? "landing",
      page_url: parsed.pageUrl,
      external_id: externalId,
      utm_source: parsed.utmSource,
      utm_medium: parsed.utmMedium,
      utm_campaign: parsed.utmCampaign,
      utm_content: parsed.utmContent,
      utm_term: parsed.utmTerm,
      crm_person_id: personId,
      payload: {
        raw_keys: Object.keys(asFormRecord(body) ?? {}),
      },
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await supabase
        .from("forms")
        .select("id, crm_person_id")
        .eq("cadastro_cliente_id", token.cadastro_cliente_id)
        .eq("form_key", formKey)
        .eq("external_id", externalId)
        .maybeSingle();
      if (again) {
        return {
          ok: true,
          submissionId: again.id,
          personId: again.crm_person_id ?? personId,
          deduped: true,
        };
      }
    }
    throw new Error(error.message);
  }

  await supabase
    .from("crm_ingest_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token.id);

  await supabase.from("crm_collector_state").upsert(
    {
      cadastro_cliente_id: token.cadastro_cliente_id,
      collector_key: "ingest_api",
      status: "live",
      detail: "Formulário recebido via POST /api/forms/v1/submit.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cadastro_cliente_id,collector_key" },
  );

  return {
    ok: true,
    submissionId: row.id,
    personId,
    deduped: false,
  };
}

export { CrmIngestAuthError, CrmIngestPayloadError };
