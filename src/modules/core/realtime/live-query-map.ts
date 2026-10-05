/** Escopos gravados por `emit_app_live_signal`. O valor tem de bater com a migration 77. */
export const LIVE_SCOPES = [
  "tasks",
  "content",
  "crm",
  "report",
  "brand",
  "plan",
  "clients",
  "metrics",
  "connections",
  "notifications",
  "access",
  "services",
  "agency",
  "finance",
  "platform",
] as const;

export type LiveScope = (typeof LIVE_SCOPES)[number];

const SCOPE_KEYS: Record<LiveScope, readonly (readonly unknown[])[]> = {
  tasks: [["lots-pendencias"], ["admin", "tarefas"], ["cliente", "tarefas"], ["app-notifications"]],
  content: [
    ["approval"],
    ["content-card"],
    ["content-card-media"],
    ["client-aprovacoes"],
    ["client-content-card"],
    ["editorial-pillars"],
    ["story-plan"],
    ["content-library"],
    ["publish-queue"],
    ["material-status"],
    ["instagram-posts"],
    ["lots-pendencias"],
  ],
  crm: [["crm"], ["lots-pendencias"]],
  report: [["operational-report"], ["relatorio-notas"], ["lots-pendencias"]],
  brand: [["admin", "diretrizes"], ["diretrizes"], ["lots-pendencias"]],
  plan: [["strategic-plan"], ["strategic-dashboard"], ["lots-pendencias"]],
  clients: [
    ["admin", "clientes"],
    ["admin", "cliente"],
    ["admin", "clientes-list"],
    ["vw_clientes_ativos"],
    ["cliente-ref"],
    ["cliente-platforms"],
    ["search-clientes"],
    ["dashboard-accounts"],
    ["lots-pendencias"],
  ],
  metrics: [
    ["platform-rows"],
    ["admin", "portfolio"],
    ["operational-report"],
    ["instagram-posts"],
    ["instagram-post-history"],
    ["cliente-sync-meta"],
    ["cliente-sync-coverage"],
    ["lots-pendencias"],
  ],
  connections: [
    ["hub-admin"],
    ["hub-client"],
    ["cliente-sync-meta"],
    ["cliente-sync-coverage"],
    ["dashboard-accounts"],
    ["lots-pendencias"],
  ],
  notifications: [["app-notifications"]],
  access: [
    ["me"],
    ["admin", "access-profiles"],
    ["admin", "access-profile"],
    ["admin", "access-audit"],
    ["admin", "access-applications"],
    ["admin", "organizations"],
    ["admin", "users"],
  ],
  services: [["admin", "servicos"]],
  agency: [["agency-os"], ["lots-pendencias"]],
  finance: [["agency-os"]],
  platform: [["me"]],
};

const SLOW_SCOPES = new Set<string>(["metrics", "crm"]);

export function liveDebounceMs(scopes: Iterable<string>): number {
  for (const scope of scopes) {
    if (SLOW_SCOPES.has(scope)) return 1_500;
  }
  return 350;
}

/** Chaves de TanStack Query que precisam ser relidas quando esses escopos mudam. */
export function queryKeysForScopes(scopes: Iterable<string>): unknown[][] {
  const requested = [...scopes];
  const names = requested.includes("reconnect") ? [...LIVE_SCOPES] : requested;
  const keys = new Map<string, unknown[]>();
  for (const name of names) {
    const mapped = SCOPE_KEYS[name as LiveScope];
    if (!mapped) continue;
    for (const key of mapped) {
      keys.set(JSON.stringify(key), [...key]);
    }
  }
  return [...keys.values()];
}
