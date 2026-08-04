import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../contracts/ingest/ingest-envelope.v1";
import type { ExecutionResultV1 } from "@/modules/platform-hub/runtime/types";
import type { AdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";

export type OfficialSyncPassOptions = {
  connectionId: string;
  /** Auditoria em `ph_timeline_events` — ex.: e-mail do admin ou `scheduler:official`. */
  actorEmail?: string | null;
};

export type OfficialSyncPassResult = {
  connectionId: string;
  status: "success" | "failed";
  durationMs: number;
  rows: number;
  error?: string;
  execution: ExecutionResultV1;
};

/**
 * Uma passagem de sync Official → MetricPipeline → `base_metricas_hub`.
 * Usado pela UI (`syncHubConnection`) e pelo CLI `hub:sync-official`.
 */
export async function runOfficialSyncPass(
  stack: AdminHubStack,
  options: OfficialSyncPassOptions,
): Promise<OfficialSyncPassResult> {
  const connectionId = asConnectionId(options.connectionId);

  await stack.timeline.append({
    connectionId: options.connectionId,
    kind: "sync_started",
    title: "Sincronização iniciada",
    actorEmail: options.actorEmail ?? undefined,
  });

  const result = await stack.manualScheduler.run(connectionId);

  if (result.status === "success" && result.envelope) {
    await stack.metricPipeline.accept(result.envelope);
    const rows = isMetricsTimeseriesEnvelope(result.envelope)
      ? result.envelope.payload.rows.length
      : 0;
    await stack.adminQueries.updateAdminFields(options.connectionId, {
      healthStatus: "healthy",
      healthScore: 90,
    });
    await stack.timeline.append({
      connectionId: options.connectionId,
      kind: "sync_finished",
      title: `Sincronização concluída (${rows} métricas)`,
      metadata: { rows, durationMs: result.durationMs },
    });

    await refreshAdminHealth(stack, options.connectionId, connectionId);

    return {
      connectionId: options.connectionId,
      status: "success",
      durationMs: result.durationMs,
      rows,
      execution: result,
    };
  }

  await stack.adminQueries.updateAdminFields(options.connectionId, {
    healthStatus: "unhealthy",
    healthScore: 20,
  });
  await stack.timeline.append({
    connectionId: options.connectionId,
    kind: "sync_failed",
    title: "Sincronização falhou",
    detail: result.error,
  });

  await refreshAdminHealth(stack, options.connectionId, connectionId);

  return {
    connectionId: options.connectionId,
    status: "failed",
    durationMs: result.durationMs,
    rows: 0,
    error: result.error,
    execution: result,
  };
}

async function refreshAdminHealth(
  stack: AdminHubStack,
  rawId: string,
  connectionId: ReturnType<typeof asConnectionId>,
): Promise<void> {
  const health = await stack.healthEngine.get(connectionId);
  await stack.adminQueries.updateAdminFields(rawId, {
    healthStatus:
      health.status === "healthy"
        ? "healthy"
        : health.status === "degraded"
          ? "degraded"
          : health.status === "unhealthy"
            ? "unhealthy"
            : "unknown",
    healthScore: health.score,
  });
}
