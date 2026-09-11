import { INTEGRATION_EVENTS_CONTRACT_VERSION } from "../../../../contracts/events/integration-events.v1";
import type { ConnectionRecordV1 } from "@/modules/platform-hub/connections/types/connection-record.v1";
import type { ExecutionResultV1 } from "@/modules/platform-hub/runtime/types";
import { countEnvelopeRows } from "@/modules/platform-hub/runtime/count-envelope-rows";
import type {
  IntegrationEventV1,
  IntegrationSyncFailedV1,
  IntegrationSyncFinishedV1,
} from "../../../../contracts/events/integration-events.v1";

export function buildIntegrationSyncFinishedEvent(
  connection: ConnectionRecordV1,
  result: ExecutionResultV1,
): IntegrationSyncFinishedV1 {
  const rowsCount = countEnvelopeRows(result.envelope);

  return {
    version: INTEGRATION_EVENTS_CONTRACT_VERSION,
    type: "INTEGRATION_SYNC_FINISHED",
    connectionId: connection.connectionId,
    pluginKey: connection.pluginKey,
    occurredAt: result.finishedAt,
    correlationId: result.executionId,
    payload: {
      latencyMs: result.durationMs,
      rowsCount,
      providerType: result.providerType,
    },
  };
}

export function buildIntegrationSyncFailedEvent(
  connection: ConnectionRecordV1,
  result: ExecutionResultV1,
  consecutiveErrors: number,
): IntegrationSyncFailedV1 {
  return {
    version: INTEGRATION_EVENTS_CONTRACT_VERSION,
    type: "INTEGRATION_SYNC_FAILED",
    connectionId: connection.connectionId,
    pluginKey: connection.pluginKey,
    occurredAt: result.finishedAt,
    correlationId: result.executionId,
    payload: {
      errorCode: "SYNC_FAILED",
      consecutiveErrors,
      message: result.error,
    },
  };
}

export function isIntegrationEvent(value: unknown): value is IntegrationEventV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as IntegrationEventV1).type === "string" &&
    (value as IntegrationEventV1).type.startsWith("INTEGRATION_")
  );
}
