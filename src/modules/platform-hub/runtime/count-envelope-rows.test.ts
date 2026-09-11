import { describe, expect, it } from "vitest";
import { countEnvelopeRows } from "./count-envelope-rows";
import type { IngestEnvelopeV1 } from "../../../../contracts/ingest/ingest-envelope.v1";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";

const connectionId = asConnectionId("11111111-1111-4111-8111-111111111111");

describe("countEnvelopeRows", () => {
  it("conta rows de metrics-timeseries", () => {
    const envelope = {
      version: "1.0.0",
      connectionId,
      pluginKey: "meta_ads",
      providerType: "official_api",
      profile: "metrics-timeseries",
      collectedAt: "2026-09-10T00:00:00.000Z",
      payload: {
        version: "1.0.0",
        connectionId,
        platformLabel: "Meta Ads",
        canonicalClientName: "X",
        window: { from: "2026-09-09", to: "2026-09-09" },
        rows: [{ date: "2026-09-09", metricKey: "spend", value: 1 }],
        source: { pluginKey: "meta_ads", providerType: "official_api" },
      },
    } as IngestEnvelopeV1;
    expect(countEnvelopeRows(envelope)).toBe(1);
  });

  it("conta items de entity-upsert (publicações Instagram)", () => {
    const envelope = {
      version: "1.0.0",
      connectionId,
      pluginKey: "instagram_organic",
      providerType: "official_api",
      profile: "entity-upsert",
      collectedAt: "2026-09-10T00:00:00.000Z",
      payload: { igMediaSync: { cadastroClienteId: 6, items: [{}, {}, {}] } },
    } as IngestEnvelopeV1;
    expect(countEnvelopeRows(envelope)).toBe(3);
  });
});
