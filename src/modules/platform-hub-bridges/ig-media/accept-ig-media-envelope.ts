import type { SupabaseClient } from "@supabase/supabase-js";
import type { IngestEnvelopeV1 } from "../../../../contracts/ingest/ingest-envelope.v1";
import {
  IG_MEDIA_SYNC_PAYLOAD_KEY,
  isIgMediaSyncPayload,
  type IgMediaSyncPayloadV1,
} from "@/modules/instagram-posts/types";
import { writeIgMediaSync, type IgMediaWriteResult } from "./supabase-ig-media.writer";

export function isIgMediaSyncEnvelope(envelope: IngestEnvelopeV1): boolean {
  return envelope.profile === "entity-upsert" && envelope.pluginKey === "instagram_organic";
}

export async function acceptIgMediaEnvelope(
  supabase: SupabaseClient,
  envelope: IngestEnvelopeV1,
): Promise<IgMediaWriteResult | null> {
  if (!isIgMediaSyncEnvelope(envelope)) return null;

  const raw = envelope.payload[IG_MEDIA_SYNC_PAYLOAD_KEY];
  if (!raw || typeof raw !== "object") {
    throw new Error("instagram_organic envelope missing igMediaSync payload");
  }

  if (!isIgMediaSyncPayload(raw as Record<string, unknown>)) {
    throw new Error("instagram_organic igMediaSync payload inválido");
  }

  const payload = { ...(raw as IgMediaSyncPayloadV1) };

  if (!payload.cadastroClienteId) {
    const { data, error } = await supabase
      .from("ph_connections")
      .select("cadastro_id")
      .eq("id", envelope.connectionId)
      .maybeSingle();
    if (error) throw new Error(`ph_connections lookup failed: ${error.message}`);
    if (!data?.cadastro_id) {
      throw new Error("Conexão instagram_organic sem cadastro_cliente vinculado");
    }
    payload.cadastroClienteId = data.cadastro_id;
  }

  return writeIgMediaSync(supabase, payload);
}
