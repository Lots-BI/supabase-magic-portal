import type { SupabaseClient } from "@supabase/supabase-js";
import { hashCrmIngestToken } from "./ingest-token";
import { mapIngestInteraction, parseIngestEvents } from "./map-ingest-interaction";
import { persistCrmSignal } from "./persist-signal.server";

export class CrmIngestAuthError extends Error {
  statusCode = 401;
  constructor(message = "Token inválido ou revogado.") {
    super(message);
    this.name = "CrmIngestAuthError";
  }
}

export class CrmIngestPayloadError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "CrmIngestPayloadError";
  }
}

type TokenRow = {
  id: string;
  cadastro_cliente_id: number;
  revoked_at: string | null;
};

async function resolveIngestToken(
  supabase: SupabaseClient,
  bearer: string,
): Promise<TokenRow> {
  const hash = hashCrmIngestToken(bearer.trim());
  const { data, error } = await supabase
    .from("crm_ingest_tokens")
    .select("id, cadastro_cliente_id, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.revoked_at) throw new CrmIngestAuthError();
  return data;
}

export type CrmIngestApiResult = {
  ok: true;
  ingested: number;
  errors: { externalId: string; error: string }[];
};

export async function ingestCrmApiPayload(
  supabase: SupabaseClient,
  bearerToken: string,
  body: unknown,
): Promise<CrmIngestApiResult> {
  const token = await resolveIngestToken(supabase, bearerToken);
  const parsed = parseIngestEvents(body);
  if ("error" in parsed) throw new CrmIngestPayloadError(parsed.error);

  const errors: { externalId: string; error: string }[] = [];
  let ingested = 0;

  for (const event of parsed.events) {
    const mapped = mapIngestInteraction(event);
    if ("error" in mapped) {
      errors.push({ externalId: event.externalId, error: mapped.error });
      continue;
    }
    try {
      await persistCrmSignal(
        supabase,
        token.cadastro_cliente_id,
        mapped.signal,
        mapped.identities,
        mapped.displayName,
        mapped.facts,
      );
      ingested += 1;
    } catch (err) {
      errors.push({
        externalId: event.externalId,
        error: err instanceof Error ? err.message : "Falha ao persistir.",
      });
    }
  }

  if (ingested > 0) {
    await supabase
      .from("crm_ingest_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", token.id);
    await supabase.from("crm_collector_state").upsert(
      {
        cadastro_cliente_id: token.cadastro_cliente_id,
        collector_key: "ingest_api",
        status: "live",
        detail: "Eventos recebidos via POST /api/crm/v1/interactions.",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cadastro_cliente_id,collector_key" },
    );
  }

  return { ok: true, ingested, errors };
}
