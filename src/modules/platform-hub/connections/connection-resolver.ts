import type { ConnectionResolverPort } from "./ports";
import type { LegacyCadastroBridgePort } from "../bridges/ports";
import type { ConnectionId, ScopeRef } from "./types";
import type { ConnectionRepositoryPort } from "./ports/connection-repository.port";

/** Resolvedor fino — ConnectionId → Bridge → ScopeRef. Sem lógica de negócio. */
export class ConnectionResolver implements ConnectionResolverPort {
  constructor(
    private readonly bridge: LegacyCadastroBridgePort,
    private readonly connections?: ConnectionRepositoryPort,
  ) {}

  async resolveScopeRef(connectionId: ConnectionId): Promise<ScopeRef> {
    try {
      return await this.bridge.resolveScopeRef(connectionId);
    } catch (error) {
      if (!this.connections) throw error;
      const record = await this.connections.get(connectionId);
      if (!record) throw error;
      this.bridge.registerConnection(connectionId, record.scopeRef);
      return record.scopeRef;
    }
  }

  async resolveCanonicalClientName(connectionId: ConnectionId): Promise<string> {
    const scopeRef = await this.resolveScopeRef(connectionId);
    return this.bridge.resolveClienteName(scopeRef);
  }

  async resolve(
    connectionId: ConnectionId,
  ): Promise<{ connectionId: ConnectionId; scopeRef: ScopeRef }> {
    const scopeRef = await this.resolveScopeRef(connectionId);
    return { connectionId, scopeRef };
  }
}
