import { describe, expect, it, vi } from "vitest";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { NormalizedMetricBatchV1 } from "../metric-batch.types";
import {
  toBaseMetricasInsertRows,
  toBaseMetricasStorageValue,
} from "../writers/map-to-base-metricas-rows";
import { InMemoryBaseMetricasWriter } from "../writers/in-memory-base-metricas.writer";
import { createMetricWriterRegistry } from "../writers/writer-registry";
import { isSupabaseWriterEnabled } from "../writers/writer-config";
import { MetricPipeline } from "../metric-pipeline";
import { InMemoryWriteAuditRepository } from "../audit/in-memory-write-audit.repository";
import type { MetricWriterPort } from "../writers/metric-writer.port";
import { SupabaseBaseMetricasWriter } from "@/modules/platform-hub-bridges/base-metricas";
import type { BaseMetricasInsertPort } from "@/modules/platform-hub-bridges/base-metricas";

function sampleBatch(overrides: Partial<NormalizedMetricBatchV1> = {}): NormalizedMetricBatchV1 {
  return {
    version: METRIC_BATCH_CONTRACT_VERSION,
    connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
    platformLabel: "Meta Ads",
    canonicalClientName: "acme_corp",
    window: { from: "2026-07-01", to: "2026-07-01" },
    rows: [{ metricKey: "impressions", value: 100, date: "2026-07-01" }],
    source: { pluginKey: "example", providerType: "make_passive" },
    normalizedAt: "2026-07-07T12:00:00.000Z",
    ...overrides,
  };
}

describe("Passive Production — Writers", () => {
  it("MemoryWriter isolado — formato base_metricas", async () => {
    const writer = new InMemoryBaseMetricasWriter();
    const result = await writer.write(sampleBatch());

    expect(result.writerKey).toBe("base_metricas_memory");
    expect(result.rowsWritten).toBe(1);
    expect(writer.snapshot()[0]).toEqual({
      cliente: "acme_corp",
      plataforma: "Meta Ads",
      metrica: "impressions",
      valor: 100,
      data: "2026-07-01",
    });
  });

  it("Google Ads spend — armazena micros como Make", () => {
    expect(toBaseMetricasStorageValue("Google Ads", "spend", 2.5)).toBe(2_500_000);
    expect(toBaseMetricasStorageValue("Google Ads", "spend", 25.5)).toBe(25_500_000);
    expect(toBaseMetricasStorageValue("Google Ads", "spend", 25.5) / 1_000_000).toBe(25.5);
    expect(toBaseMetricasStorageValue("Meta Ads", "spend", 2.5)).toBe(2.5);
  });

  it("SupabaseWriter isolado — insert via port mock", async () => {
    const insertPort: BaseMetricasInsertPort = {
      writeRows: vi.fn(async (rows) => ({ written: rows.length })),
    };

    const writer = new SupabaseBaseMetricasWriter({ enabled: true, insertPort });
    const result = await writer.write(sampleBatch());

    expect(result.writerKey).toBe("base_metricas_supabase:hub");
    expect(result.rowsWritten).toBe(1);
    expect(insertPort.writeRows).toHaveBeenCalledWith([
      {
        data: "2026-07-01",
        cliente: "acme_corp",
        plataforma: "Meta Ads",
        metrica: "impressions",
        valor: 100,
        campanha: null,
      },
    ]);
  });

  it("SupabaseWriter desligado por padrão (feature flag)", async () => {
    const insertPort: BaseMetricasInsertPort = {
      writeRows: vi.fn(async () => ({ written: 0 })),
    };
    const writer = new SupabaseBaseMetricasWriter({ enabled: false, insertPort });
    const result = await writer.write(sampleBatch());

    expect(result.rowsWritten).toBe(0);
    expect(result.rowsSkipped).toBe(1);
    expect(insertPort.writeRows).not.toHaveBeenCalled();
  });

  it("MemoryWriter não conta skip em dobro quando o cliente falta", async () => {
    const writer = new InMemoryBaseMetricasWriter();
    const result = await writer.write(sampleBatch({ canonicalClientName: "" }));
    expect(result.rowsWritten).toBe(0);
    expect(result.rowsSkipped).toBe(1);
  });

  it("Dual Writer — memory + supabase", async () => {
    const memory = new InMemoryBaseMetricasWriter();
    const insertPort: BaseMetricasInsertPort = {
      writeRows: vi.fn(async (rows) => ({ written: rows.length })),
    };
    const supabase = new SupabaseBaseMetricasWriter({ enabled: true, insertPort });
    const pipeline = new MetricPipeline([memory, supabase], new InMemoryWriteAuditRepository());

    const result = await pipeline.accept({
      version: "1.0.0",
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      pluginKey: "example",
      providerType: "make_passive",
      profile: "metrics-timeseries",
      collectedAt: new Date().toISOString(),
      payload: sampleBatch(),
    });

    expect(result.writerResults).toHaveLength(2);
    expect(result.writerResults[0]?.writerKey).toBe("base_metricas_memory");
    expect(result.writerResults[1]?.writerKey).toBe("base_metricas_supabase:hub");
    expect(memory.snapshot()).toHaveLength(1);
  });

  it("Falha de um writer não impede o outro", async () => {
    const memory = new InMemoryBaseMetricasWriter();
    const failing: MetricWriterPort = {
      writerKey: "failing_writer",
      write: vi.fn(async () => {
        throw new Error("supabase down");
      }),
    };

    const pipeline = new MetricPipeline([failing, memory], new InMemoryWriteAuditRepository());
    const result = await pipeline.accept({
      version: "1.0.0",
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      pluginKey: "example",
      providerType: "make_passive",
      profile: "metrics-timeseries",
      collectedAt: new Date().toISOString(),
      payload: sampleBatch(),
    });

    expect(result.writerResults[0]?.rowsWritten).toBe(0);
    expect(result.writerResults[1]?.rowsWritten).toBe(1);
    expect(memory.snapshot()).toHaveLength(1);
  });

  it("Writer registry — mode both inclui memory + supabase", () => {
    const supabase = new SupabaseBaseMetricasWriter({ enabled: false });
    const registry = createMetricWriterRegistry({
      mode: "both",
      supabaseWriter: supabase,
    });

    expect(registry.writers).toHaveLength(2);
    expect(registry.writers[0]?.writerKey).toBe("base_metricas_memory");
    expect(registry.writers[1]?.writerKey).toBe("base_metricas_supabase");
  });

  it("toBaseMetricasInsertRows — compatível com colunas base_metricas", () => {
    const rows = toBaseMetricasInsertRows(
      sampleBatch({
        platformLabel: "Google Ads",
        rows: [{ metricKey: "spend", value: 3, date: "2026-07-01", campaign: "camp-1" }],
      }),
    );

    expect(rows[0]).toEqual({
      data: "2026-07-01",
      cliente: "acme_corp",
      plataforma: "Google Ads",
      metrica: "spend",
      valor: 3_000_000,
      campanha: "camp-1",
    });
  });

  it("isSupabaseWriterEnabled — false sem env", () => {
    const prev = process.env.PLATFORM_HUB_SUPABASE_WRITER;
    delete process.env.PLATFORM_HUB_SUPABASE_WRITER;
    expect(isSupabaseWriterEnabled()).toBe(false);
    process.env.PLATFORM_HUB_SUPABASE_WRITER = prev;
  });

  it("MemoryWriter replace-by-day — spend 10 depois 12 vira uma linha 12", async () => {
    const writer = new InMemoryBaseMetricasWriter();
    await writer.write(
      sampleBatch({
        rows: [{ metricKey: "spend", value: 10, date: "2026-07-01", campaign: "A" }],
      }),
    );
    await writer.write(
      sampleBatch({
        rows: [{ metricKey: "spend", value: 12, date: "2026-07-01", campaign: "A" }],
      }),
    );

    expect(writer.snapshot()).toEqual([
      {
        cliente: "acme_corp",
        plataforma: "Meta Ads",
        metrica: "spend",
        valor: 12,
        data: "2026-07-01",
        campanha: "A",
      },
    ]);
  });

  it("MemoryWriter replace-by-day — campanha que some some do dia", async () => {
    const writer = new InMemoryBaseMetricasWriter();
    await writer.write(
      sampleBatch({
        rows: [
          { metricKey: "spend", value: 10, date: "2026-07-01", campaign: "A" },
          { metricKey: "spend", value: 4, date: "2026-07-01", campaign: "B" },
        ],
      }),
    );
    await writer.write(
      sampleBatch({
        rows: [{ metricKey: "spend", value: 4, date: "2026-07-01", campaign: "B" }],
      }),
    );

    expect(writer.snapshot().map((row) => row.campanha)).toEqual(["B"]);
  });

  it("MemoryWriter replace-by-day — outra plataforma e outra data ficam", async () => {
    const writer = new InMemoryBaseMetricasWriter();
    await writer.write(
      sampleBatch({
        platformLabel: "Instagram",
        rows: [{ metricKey: "reach", value: 100, date: "2026-07-01" }],
      }),
    );
    await writer.write(
      sampleBatch({
        rows: [
          { metricKey: "spend", value: 10, date: "2026-07-01" },
          { metricKey: "spend", value: 5, date: "2026-07-02" },
        ],
      }),
    );
    await writer.write(
      sampleBatch({
        rows: [{ metricKey: "spend", value: 12, date: "2026-07-01" }],
      }),
    );

    const snap = writer.snapshot();
    expect(snap.find((row) => row.plataforma === "Instagram")?.valor).toBe(100);
    expect(
      snap.find((row) => row.plataforma === "Meta Ads" && row.data === "2026-07-02")?.valor,
    ).toBe(5);
    expect(
      snap.find((row) => row.plataforma === "Meta Ads" && row.data === "2026-07-01")?.valor,
    ).toBe(12);
  });
});
