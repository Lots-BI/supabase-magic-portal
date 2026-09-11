import type { IngestEnvelopeV1 } from "../../../../contracts/ingest/ingest-envelope.v1";

/** Conta linhas persistíveis do envelope — timeseries ou items de entity-upsert. */
export function countEnvelopeRows(envelope: IngestEnvelopeV1 | undefined): number {
  if (!envelope) return 0;
  if (envelope.profile === "metrics-timeseries") {
    return envelope.payload.rows.length;
  }
  if (envelope.profile !== "entity-upsert") return 0;

  let total = 0;
  for (const value of Object.values(envelope.payload)) {
    if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
      total += (value as { items: unknown[] }).items.length;
    }
  }
  return total;
}
