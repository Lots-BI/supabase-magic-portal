/**
 * Camada de diagnóstico operacional Lots BI — reutilizável em workers, APIs e UI.
 */
export {
  buildAuthDiagnostics,
  buildProductionChecklist,
  type AuthDiagnosticsReport,
  type DiagnosticCheck,
  type DiagnosticStatus,
} from "./auth-diagnostics";
export {
  detectLotsEnvironment,
  environmentLabel,
  hostnamesMatch,
  resolveExpectedAppUrl,
  DEFAULT_PRODUCTION_APP_URL,
  type LotsEnvironment,
} from "./environment";
export {
  recordInviteAudit,
  getInviteAuditLog,
  getInviteStatsForEmail,
  type InviteAuditEntry,
} from "./invite-audit";
export {
  buildIntegrationDiagnostics,
  type IntegrationDiagnostic,
} from "./integrations-diagnostics";
export type { SystemDiagnosticsReport } from "./system-diagnostics.types";
