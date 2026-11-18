import type { SupabaseClient } from "@supabase/supabase-js";
import { mapLeadForm } from "./map-lead-form";
import {
  leadCollectorDetail,
  mapInstantFormSubmission,
  type MetaLeadRecord,
} from "./meta-instant-form";
import { persistCrmSignal } from "./persist-signal.server";

export async function markLeadAdsCollector(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  kind: "live" | "scope_missing" | "planned",
  raw?: string,
) {
  const { error } = await supabase.from("crm_collector_state").upsert(
    {
      cadastro_cliente_id: cadastroClienteId,
      collector_key: "lead_ads",
      status: kind,
      detail: leadCollectorDetail(kind, raw),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cadastro_cliente_id,collector_key" },
  );
  if (error) throw new Error(error.message);
}

export async function saveMetaInstantLead(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  lead: MetaLeadRecord,
): Promise<{ submissionId: string; personId: string; deduped: boolean }> {
  const row = mapInstantFormSubmission(lead);
  if (!row) throw new Error("Lead da Meta sem id.");

  const { data: existing, error: existingError } = await supabase
    .from("forms")
    .select("id, crm_person_id")
    .eq("cadastro_cliente_id", cadastroClienteId)
    .eq("form_key", row.formKey)
    .eq("external_id", row.externalId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.id) {
    return {
      submissionId: existing.id,
      personId: existing.crm_person_id ?? "",
      deduped: true,
    };
  }

  const mapped = mapLeadForm({
    id: lead.id,
    createdTime: row.createdAt,
    fieldData: lead.fieldData,
    campaignId: lead.campaignId,
    campaignName: lead.campaignName,
  });
  if (!mapped) throw new Error("Lead da Meta sem id.");

  const { personId } = await persistCrmSignal(
    supabase,
    cadastroClienteId,
    mapped.signal,
    mapped.identities,
    mapped.displayName,
    mapped.facts,
  );

  const { data: inserted, error } = await supabase
    .from("forms")
    .insert({
      cadastro_cliente_id: cadastroClienteId,
      form_key: row.formKey,
      nome: row.nome,
      email: row.email,
      instagram: row.instagram,
      telefone: row.telefone,
      mensagem: row.mensagem,
      source: row.source,
      page_url: null,
      external_id: row.externalId,
      utm_source: row.utmSource,
      utm_medium: row.utmMedium,
      utm_campaign: row.utmCampaign,
      utm_content: row.utmContent,
      utm_term: row.utmTerm,
      crm_person_id: personId,
      created_at: row.createdAt,
      payload: row.payload,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await supabase
        .from("forms")
        .select("id, crm_person_id")
        .eq("cadastro_cliente_id", cadastroClienteId)
        .eq("form_key", row.formKey)
        .eq("external_id", row.externalId)
        .maybeSingle();
      if (again?.id) {
        return {
          submissionId: again.id,
          personId: again.crm_person_id ?? personId,
          deduped: true,
        };
      }
    }
    throw new Error(error.message);
  }

  return { submissionId: inserted.id, personId, deduped: false };
}
