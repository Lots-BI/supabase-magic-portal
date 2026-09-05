import type { LegacyCadastroBridgePort } from "../bridges/ports";
import type { ConnectionRepositoryPort } from "./ports/connection-repository.port";
import { ConnectionResolver } from "./connection-resolver";

export function createConnectionResolver(
  bridge: LegacyCadastroBridgePort,
  connections?: ConnectionRepositoryPort,
): ConnectionResolver {
  return new ConnectionResolver(bridge, connections);
}
