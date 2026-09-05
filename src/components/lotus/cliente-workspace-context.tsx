import { createContext, useContext, type ReactNode } from "react";

const ClienteWorkspaceContext = createContext<string | null>(null);

export function ClienteWorkspaceProvider({
  queryName,
  children,
}: {
  queryName: string;
  children: ReactNode;
}) {
  return (
    <ClienteWorkspaceContext.Provider value={queryName}>{children}</ClienteWorkspaceContext.Provider>
  );
}

export function useClienteWorkspaceQueryName() {
  return useContext(ClienteWorkspaceContext);
}
