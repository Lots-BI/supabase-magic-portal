import { describe, expect, it, vi } from "vitest";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { BaseMetricasInsertPort } from "../ports/base-metricas-insert.port";
import {
  METRICAS_TABLE_HUB,
  METRICAS_TABLE_MAKE,
  assertHubWriterTable,
  resolveWriterTables,
  resolveWriterTarget,
} from "../writer-target.config";
import {
  createHomologationHubWriter,
  createSupabaseBaseMetricasWriter,
} from "../supabase-base-metricas.writer";

describe("writer-target.config", () => {
  it("default homologation target is HUB", () => {
    expect(resolveWriterTarget()).toBe("HUB");
    expect(resolveWriterTables("HUB")).toEqual([METRICAS_TABLE_HUB]);
  });

  it("bloqueia escrita MAKE pelo Platform Hub", () => {
    expect(() => resolveWriterTables("MAKE")).toThrow(/cannot target MAKE/);
    expect(() => assertHubWriterTable(METRICAS_TABLE_MAKE)).toThrow(/forbidden/);
  });

  it("BOTH escreve apenas hub durante homologação", () => {
    expect(resolveWriterTables("BOTH")).toEqual([METRICAS_TABLE_HUB]);
  });
});

describe("SupabaseBaseMetricasWriter — HUB target", () => {
  it("grava via insert port quando habilitado", async () => {
    const insertPort: BaseMetricasInsertPort = {
      writeRows: vi.fn(async (rows) => ({ written: rows.length })),
    };

    const writer = createSupabaseBaseMetricasWriter({
      enabled: true,
      writerTarget: "HUB",
      insertPort,
    });

    const result = await writer.write({
      version: METRIC_BATCH_CONTRACT_VERSION,
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      platformLabel: "Meta Ads",
      canonicalClientName: "Acme",
      window: { from: "2026-07-01", to: "2026-07-01" },
      rows: [{ metricKey: "impressions", value: 10, date: "2026-07-01" }],
      source: { pluginKey: "meta_ads", providerType: "official_api" },
      normalizedAt: new Date().toISOString(),
    });

    expect(result.rowsWritten).toBe(1);
    expect(insertPort.writeRows).toHaveBeenCalled();
    expect(writer.target).toBe("HUB");
  });
});

describe("createHomologationHubWriter", () => {
  it("cria writer com target HUB", () => {
    const writer = createHomologationHubWriter();
    expect(writer.target).toBe("HUB");
  });
});
