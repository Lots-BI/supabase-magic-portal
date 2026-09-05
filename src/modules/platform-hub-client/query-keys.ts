export const hubClientKeys = {
  all: ["hub-client"] as const,
  status: (cadastroClienteId: number) =>
    [...hubClientKeys.all, "status", cadastroClienteId] as const,
  discover: (connectionId: string) => [...hubClientKeys.all, "discover", connectionId] as const,
};
