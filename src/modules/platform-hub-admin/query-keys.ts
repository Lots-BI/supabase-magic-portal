export const hubAdminKeys = {
  all: ["hub-admin"] as const,
  overview: () => [...hubAdminKeys.all, "overview"] as const,
  catalog: () => [...hubAdminKeys.all, "catalog"] as const,
  oauthEnv: () => [...hubAdminKeys.all, "oauth-env"] as const,
  connections: (filters?: Record<string, unknown>) =>
    [...hubAdminKeys.all, "connections", filters ?? {}] as const,
  connection: (id: string) => [...hubAdminKeys.all, "connection", id] as const,
  timeline: (connectionId?: string) =>
    [...hubAdminKeys.all, "timeline", connectionId ?? "all"] as const,
  health: () => [...hubAdminKeys.all, "health"] as const,
  diagnostics: (connectionId: string) =>
    [...hubAdminKeys.all, "diagnostics", connectionId] as const,
  clientConnections: (cadastroId: number) => [...hubAdminKeys.all, "client", cadastroId] as const,
};
