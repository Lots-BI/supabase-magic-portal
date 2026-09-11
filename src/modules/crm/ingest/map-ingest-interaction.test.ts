import { describe, expect, it } from "vitest";
import { mapIngestInteraction, parseIngestEvents } from "./map-ingest-interaction";

describe("parseIngestEvents", () => {
  it("accepts a single snake_case event", () => {
    const parsed = parseIngestEvents({
      channel: "whatsapp",
      external_id: "wamid.1",
      identities: [{ kind: "whatsapp", value: "5511999999999" }],
    });
    expect("events" in parsed && parsed.events).toHaveLength(1);
  });

  it("accepts a top-level array of events", () => {
    const parsed = parseIngestEvents([
      {
        channel: "form",
        external_id: "tf-1",
        identities: [{ kind: "email", value: "ana@marca.com" }],
      },
    ]);
    expect("events" in parsed && parsed.events).toHaveLength(1);
  });

  it("rejects more than 50 events", () => {
    const events = Array.from({ length: 51 }, (_, i) => ({
      channel: "other",
      external_id: `e${i}`,
      identities: [{ kind: "phone", value: "5511" }],
    }));
    expect(parseIngestEvents({ events })).toEqual({ error: "Máximo 50 eventos por request." });
  });
});

describe("mapIngestInteraction", () => {
  it("maps WhatsApp without scraping email from the body", () => {
    const mapped = mapIngestInteraction({
      channel: "whatsapp",
      externalId: "wamid.1",
      body: "meu email é ana@marca.com quero orçamento",
      identities: [{ kind: "whatsapp", value: "+55 (11) 99999-9999" }],
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    expect(mapped.signal.kind).toBe("whatsapp");
    expect(mapped.signal.source).toBe("ingest_api:whatsapp");
    expect(mapped.identities.some((i) => i.kind === "email")).toBe(false);
    expect(mapped.identities.some((i) => i.kind === "whatsapp" && i.value.includes("5511"))).toBe(
      true,
    );
    expect(mapped.facts).toEqual([]);
  });

  it("stores structured facts and email identity only from facts[]", () => {
    const mapped = mapIngestInteraction({
      channel: "form",
      externalId: "tf-1",
      identities: [{ kind: "email", value: "Ana@Marca.com" }],
      facts: [{ field: "email", value: "Ana@Marca.com" }, { field: "full_name", value: "Ana" }],
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    expect(mapped.signal.kind).toBe("form");
    expect(mapped.signal.place).toBe("web");
    expect(mapped.displayName).toBe("Ana");
    expect(mapped.facts.some((f) => f.field === "email")).toBe(true);
  });

  it("maps outbound direction to brand_reply", () => {
    const mapped = mapIngestInteraction({
      channel: "whatsapp",
      externalId: "bot-1",
      direction: "outbound",
      identities: [{ kind: "whatsapp", value: "5511999" }],
    });
    expect("error" in mapped).toBe(false);
    if ("error" in mapped) return;
    expect(mapped.signal.kind).toBe("brand_reply");
  });

  it("requires at least one known identity", () => {
    const mapped = mapIngestInteraction({
      channel: "other",
      externalId: "x",
      identities: [{ kind: "twitter", value: "ana" }],
    });
    expect(mapped).toMatchObject({ error: expect.stringContaining("identidade") });
  });
});
