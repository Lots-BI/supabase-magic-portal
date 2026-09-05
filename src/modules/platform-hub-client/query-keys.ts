export const hubClientKeys = {
  all: ["hub-client"] as const,
  status: (cadastroClienteId: number, pluginKey: string) =>
    [...hubClientKeys.all, "status", cadastroClienteId, pluginKey] as const,
  discover: (connectionId: string) => [...hubClientKeys.all, "discover", connectionId] as const,
};
