import type { SupabaseClient } from "@supabase/supabase-js";
import { computePersonStats } from "../compute-person-stats";
import { resolvePersonStitch } from "../stitch";
import type { CrmFieldFactInput, CrmIdentityInput, CrmSignalInput } from "../types";
import { notifyHighIntent } from "./notify-intent.server";

export async function persistCrmSignal(
  supabase: SupabaseClient,
  cadastroClienteId: number,
  signal: CrmSignalInput,
  identities: CrmIdentityInput[],
  displayName: string,
  facts: CrmFieldFactInput[] = [],
): Promise<{ personId: string }> {
  const { data: existingIdentities } = await supabase
    .from("crm_identities")
    .select("person_id, kind, value")
    .eq("cadastro_cliente_id", cadastroClienteId);

  const peopleMap = new Map<string, CrmIdentityInput[]>();
  for (const row of existingIdentities ?? []) {
    const list = peopleMap.get(row.person_id) ?? [];
    list.push({ kind: row.kind, value: row.value });
    peopleMap.set(row.person_id, list);
  }
  const people = [...peopleMap.entries()].map(([id, ids]) => ({ id, identities: ids }));

  const igsid = identities.find((i) => i.kind === "igsid")?.value ?? null;
  const username = identities.find((i) => i.kind === "ig_username")?.value ?? null;
  const email = identities.find((i) => i.kind === "email")?.value ?? null;
  const phone = identities.find((i) => i.kind === "phone")?.value ?? null;
  const whatsapp = identities.find((i) => i.kind === "whatsapp")?.value ?? null;
  const decision = resolvePersonStitch({ people, igsid, username, email, phone, whatsapp });

  let personId: string;
  if (decision.action === "match") {
    personId = decision.personId;
  } else {
    const { data: created, error } = await supabase
      .from("crm_people")
      .insert({
        cadastro_cliente_id: cadastroClienteId,
        display_name: displayName,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    personId = created.id;
    for (const ident of decision.identities) {
      await supabase.from("crm_identities").upsert(
        {
          person_id: personId,
          cadastro_cliente_id: cadastroClienteId,
          kind: ident.kind,
          value: ident.value,
          source: ident.source ?? signal.source,
        },
        { onConflict: "cadastro_cliente_id,kind,value" },
      );
    }
  }

  for (const ident of identities) {
    await supabase.from("crm_identities").upsert(
      {
        person_id: personId,
        cadastro_cliente_id: cadastroClienteId,
        kind: ident.kind,
        value: ident.value,
        source: ident.source ?? signal.source,
      },
      { onConflict: "cadastro_cliente_id,kind,value" },
    );
  }

  const { error: signalError } = await supabase.from("crm_signals").upsert(
    {
      person_id: personId,
      cadastro_cliente_id: cadastroClienteId,
      kind: signal.kind,
      place: signal.place,
      source: signal.source,
      external_id: signal.externalId,
      body: signal.body,
      occurred_at: signal.occurredAt,
      ig_media_id: signal.igMediaId,
      content_card_id: signal.contentCardId,
      payload: signal.payload ?? {},
    },
    { onConflict: "cadastro_cliente_id,source,external_id" },
  );
  if (signalError) throw new Error(signalError.message);

  for (const fact of facts) {
    await supabase.from("crm_field_facts").upsert(
      {
        person_id: personId,
        cadastro_cliente_id: cadastroClienteId,
        field: fact.field,
        value: fact.value,
        source: fact.source,
        collected_at: fact.collectedAt,
      },
      { onConflict: "person_id,field,source" },
    );
  }

  await recomputeAndStoreStats(supabase, personId, cadastroClienteId);
  return { personId };
}

export async function recomputeAndStoreStats(
  supabase: SupabaseClient,
  personId: string,
  cadastroClienteId: number,
) {
  const { data: rows, error } = await supabase
    .from("crm_signals")
    .select(
      "kind, place, source, external_id, body, occurred_at, ig_media_id, content_card_id, payload",
    )
    .eq("person_id", personId);
  if (error) throw new Error(error.message);

  const { data: facts } = await supabase
    .from("crm_field_facts")
    .select("field, value, source, collected_at")
    .eq("person_id", personId);

  const signals: CrmSignalInput[] = (rows ?? []).map((row) => ({
    kind: row.kind,
    place: row.place,
    source: row.source,
    externalId: row.external_id,
    body: row.body,
    occurredAt: row.occurred_at,
    igMediaId: row.ig_media_id,
    contentCardId: row.content_card_id,
    payload: (row.payload ?? {}) as CrmSignalInput["payload"],
  }));
  const factInputs: CrmFieldFactInput[] = (facts ?? []).map((f) => ({
    field: f.field,
    value: f.value,
    source: f.source,
    collectedAt: f.collected_at,
  }));
  const stats = computePersonStats(signals, factInputs);

  const { error: statsError } = await supabase.from("crm_person_stats").upsert({
    person_id: personId,
    cadastro_cliente_id: cadastroClienteId,
    signal_count: stats.signalCount,
    kind_counts: stats.kindCounts,
    place_counts: stats.placeCounts,
    media_distinct: stats.mediaDistinct,
    card_distinct: stats.cardDistinct,
    pillar_affinity: stats.pillarAffinity,
    recency_days: stats.recencyDays,
    tenure_days: stats.tenureDays,
    active_weeks: stats.activeWeeks,
    streak_weeks: stats.streakWeeks,
    churn_state: stats.churnState,
    intent_score: stats.intentScore,
    pii_completeness: stats.piiCompleteness,
    heat_score: stats.heatScore,
    first_signal_at: stats.firstSignalAt,
    last_signal_at: stats.lastSignalAt,
    computed_at: new Date().toISOString(),
  });
  if (statsError) throw new Error(statsError.message);

  await supabase
    .from("crm_people")
    .update({
      first_signal_at: stats.firstSignalAt,
      last_signal_at: stats.lastSignalAt,
    })
    .eq("id", personId);

  const { data: person } = await supabase
    .from("crm_people")
    .select("display_name")
    .eq("id", personId)
    .maybeSingle();
  await notifyHighIntent(supabase, {
    cadastroClienteId,
    personId,
    displayName: person?.display_name ?? "Alguém",
    score: stats.intentScore,
  });
}
