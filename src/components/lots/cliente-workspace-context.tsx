import { createContext, useContext, type ReactNode } from "react";

export type ClienteWorkspaceValue = {
  queryName: string;
  cadastroId: number | null;
};

const ClienteWorkspaceContext = createContext<ClienteWorkspaceValue | null>(null);

export function ClienteWorkspaceProvider({
  queryName,
  cadastroId,
  children,
}: {
  queryName: string;
  cadastroId?: number | null;
  children: ReactNode;
}) {
  return (
    <ClienteWorkspaceContext.Provider value={{ queryName, cadastroId: cadastroId ?? null }}>
      {children}
    </ClienteWorkspaceContext.Provider>
  );
}

export function useClienteWorkspace(): ClienteWorkspaceValue | null {
  return useContext(ClienteWorkspaceContext);
}

export function useClienteWorkspaceQueryName() {
  return useContext(ClienteWorkspaceContext)?.queryName ?? null;
}
