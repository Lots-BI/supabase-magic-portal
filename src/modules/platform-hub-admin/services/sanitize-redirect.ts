const ALLOWED_PREFIXES = [
  "/admin/conexoes",
  "/admin/conexoes/nova",
  "/admin/conexoes/testing",
  "/admin/conexoes/rollout",
  "/admin/conexoes/health",
  "/admin/conexoes/migracao",
] as const;

/** Portal cliente: aba de conexões self-service, ex. /cliente/agencia-lots/conexoes. */
const ALLOWED_PATTERNS = [/^\/cliente\/[^/]+\/conexoes(?:\/.*)?$/] as const;

/** Bloqueia open redirect — apenas paths internos do Platform Hub (admin ou cliente). */
export function sanitizeOAuthRedirectAfter(redirectAfter: string): string {
  const trimmed = redirectAfter.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error("redirectAfter inválido");
  }
  if (trimmed.startsWith("//") || trimmed.includes("://")) {
    throw new Error("redirectAfter externo não permitido");
  }
  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  const allowed =
    ALLOWED_PREFIXES.some((prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) ||
    ALLOWED_PATTERNS.some((pattern) => pattern.test(pathOnly));
  if (!allowed) {
    throw new Error("redirectAfter fora do escopo permitido");
  }
  return trimmed;
}
