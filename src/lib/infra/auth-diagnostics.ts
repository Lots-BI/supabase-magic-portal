/**
 * Diagnóstico Supabase Auth — lógica pura, reutilizável em workers e APIs.
 */
import { buildAuthInviteRedirectUrl, isLocalhostUrl } from "@/lib/app-url";
import {
  detectLotsEnvironment,
  environmentLabel,
  hostnamesMatch,
  resolveExpectedAppUrl,
  type LotsEnvironment,
} from "./environment";

export type DiagnosticStatus = "ok" | "warn" | "error";

export interface DiagnosticCheck {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail?: string;
}

export interface AuthDiagnosticsReport {
  environment: LotsEnvironment;
  environment_label: string;
  app_url_configured: string | null;
  current_domain: string | null;
  expected_app_url: string;
  expected_site_url: string;
  invite_redirect: string;
  recovery_redirect: string;
  magic_link_redirect: string;
  status: DiagnosticStatus;
  invites_allowed: boolean;
  production_ready: boolean;
  checks: DiagnosticCheck[];
  message: string | null;
  block_invites_reason: string | null;
}

export interface AuthDiagnosticsInput {
  appUrlConfigured: string | null;
  currentDomain: string | null;
  nodeEnv?: string;
  isViteProd?: boolean;
  productionUrl?: string;
  stagingUrl?: string;
  supabaseClientReady?: boolean;
  supabaseAuthAvailable?: boolean;
  smtpManagedBySupabase?: boolean;
}

function statusRank(s: DiagnosticStatus): number {
  return s === "error" ? 2 : s === "warn" ? 1 : 0;
}

function worst(...statuses: DiagnosticStatus[]): DiagnosticStatus {
  return statuses.sort((a, b) => statusRank(b) - statusRank(a))[0] ?? "ok";
}

export function buildAuthDiagnostics(input: AuthDiagnosticsInput): AuthDiagnosticsReport {
  const currentDomain = input.currentDomain;
  const hostname = currentDomain ?? input.appUrlConfigured ?? "localhost";
  const environment = detectLotsEnvironment(hostname, {
    nodeEnv: input.nodeEnv,
    isViteProd: input.isViteProd,
  });
  const expectedAppUrl = resolveExpectedAppUrl(environment, {
    productionUrl: input.productionUrl,
    stagingUrl: input.stagingUrl,
    developmentUrl: input.appUrlConfigured ?? undefined,
  });

  const inviteRedirect = buildAuthInviteRedirectUrl(expectedAppUrl);
  const recoveryRedirect = inviteRedirect;
  const magicLinkRedirect = inviteRedirect;

  const checks: DiagnosticCheck[] = [];

  // APP_URL
  if (!input.appUrlConfigured?.trim()) {
    checks.push({
      id: "app_url",
      label: "APP_URL",
      status: environment === "development" ? "warn" : "error",
      detail: "Não configurada no servidor",
    });
  } else if (isLocalhostUrl(input.appUrlConfigured) && environment !== "development") {
    checks.push({
      id: "app_url",
      label: "APP_URL",
      status: "error",
      detail: `Aponta para localhost em ${environmentLabel(environment)}`,
    });
  } else {
    checks.push({
      id: "app_url",
      label: "APP_URL",
      status: "ok",
      detail: input.appUrlConfigured,
    });
  }

  // Domínio atual
  if (!currentDomain) {
    checks.push({
      id: "current_domain",
      label: "Domínio atual",
      status: "warn",
      detail: "Não informado (somente servidor)",
    });
  } else {
    checks.push({
      id: "current_domain",
      label: "Domínio atual",
      status: "ok",
      detail: currentDomain,
    });
  }

  // Ambiente
  checks.push({
    id: "environment",
    label: "Ambiente",
    status: "ok",
    detail: environmentLabel(environment),
  });

  // APP_URL vs esperado para o ambiente
  const configured = input.appUrlConfigured;
  if (configured && !hostnamesMatch(configured, expectedAppUrl)) {
    const severity: DiagnosticStatus = environment === "development" ? "warn" : "error";
    checks.push({
      id: "app_url_expected",
      label: "APP_URL vs ambiente",
      status: severity,
      detail: `Configurada: ${configured} · Esperada: ${expectedAppUrl}`,
    });
  } else if (configured) {
    checks.push({
      id: "app_url_expected",
      label: "APP_URL vs ambiente",
      status: "ok",
      detail: `Alinhada com ${environmentLabel(environment)}`,
    });
  }

  // Domínio atual vs APP_URL
  if (configured && currentDomain && !hostnamesMatch(configured, currentDomain)) {
    checks.push({
      id: "domain_match",
      label: "Domínio atual = APP_URL",
      status: environment === "development" ? "warn" : "error",
      detail: `APP_URL: ${configured} · Atual: ${currentDomain}`,
    });
  } else if (configured && currentDomain) {
    checks.push({
      id: "domain_match",
      label: "Domínio atual = APP_URL",
      status: "ok",
      detail: "Domínios coincidem",
    });
  }

  // Site URL esperada
  checks.push({
    id: "site_url",
    label: "Site URL esperada (Supabase)",
    status: configured && hostnamesMatch(configured, expectedAppUrl) ? "ok" : "warn",
    detail: expectedAppUrl,
  });

  // Redirects
  for (const [id, label, url] of [
    ["invite_redirect", "Redirect convites", inviteRedirect],
    ["recovery_redirect", "Redirect recuperação de senha", recoveryRedirect],
    ["magic_link_redirect", "Redirect magic link", magicLinkRedirect],
  ] as const) {
    checks.push({
      id,
      label,
      status: configured ? "ok" : "warn",
      detail: url,
    });
  }

  // Supabase client
  checks.push({
    id: "supabase_client",
    label: "Cliente Supabase",
    status: input.supabaseClientReady === false ? "error" : "ok",
    detail: input.supabaseClientReady === false ? "Não inicializado" : "Inicializado",
  });

  checks.push({
    id: "supabase_auth",
    label: "Auth disponível",
    status: input.supabaseAuthAvailable === false ? "error" : "ok",
    detail: input.supabaseAuthAvailable === false ? "Indisponível" : "Disponível",
  });

  checks.push({
    id: "invites_enabled",
    label: "Convites habilitados",
    status: "ok",
    detail: "Via Supabase Auth Admin API",
  });

  checks.push({
    id: "smtp",
    label: "SMTP / e-mail",
    status: input.smtpManagedBySupabase === false ? "warn" : "ok",
    detail:
      input.smtpManagedBySupabase === false ? "Não verificado" : "Gerenciado pelo Supabase Auth",
  });

  const hasError = checks.some((c) => c.status === "error");
  const hasWarn = checks.some((c) => c.status === "warn");
  const status = worst(hasError ? "error" : "ok", hasWarn ? "warn" : "ok");

  let invitesAllowed = true;
  let blockReason: string | null = null;
  let message: string | null = null;

  if (!configured?.trim()) {
    invitesAllowed = false;
    blockReason = "APP_URL não está configurada no servidor.";
  } else if (environment !== "development" && isLocalhostUrl(configured)) {
    invitesAllowed = false;
    blockReason = `APP_URL aponta para localhost em ${environmentLabel(environment)}.`;
  } else if (!hostnamesMatch(configured, expectedAppUrl)) {
    invitesAllowed = false;
    blockReason = `APP_URL (${configured}) não corresponde ao domínio esperado para ${environmentLabel(environment)} (${expectedAppUrl}).`;
  } else if (
    currentDomain &&
    !hostnamesMatch(configured, currentDomain) &&
    environment !== "development"
  ) {
    invitesAllowed = false;
    blockReason = `APP_URL (${configured}) difere do domínio atual da aplicação (${currentDomain}).`;
  }

  if (!invitesAllowed) {
    message = [
      "A configuração do Supabase Auth não está pronta para produção.",
      "",
      `APP_URL atual: ${configured ?? "(vazia)"}`,
      `Esperado (${environmentLabel(environment)}): ${expectedAppUrl}`,
      "",
      "Corrija a configuração antes de enviar convites.",
    ].join("\n");
  } else if (status === "warn" && environment === "development") {
    message = null;
  }

  const productionReady =
    environment === "production" &&
    status === "ok" &&
    invitesAllowed &&
    input.supabaseClientReady !== false &&
    input.supabaseAuthAvailable !== false;

  return {
    environment,
    environment_label: environmentLabel(environment),
    app_url_configured: configured,
    current_domain: currentDomain,
    expected_app_url: expectedAppUrl,
    expected_site_url: expectedAppUrl,
    invite_redirect: inviteRedirect,
    recovery_redirect: recoveryRedirect,
    magic_link_redirect: magicLinkRedirect,
    status,
    invites_allowed: invitesAllowed,
    production_ready: productionReady,
    checks,
    message,
    block_invites_reason: blockReason,
  };
}

export function buildProductionChecklist(
  auth: AuthDiagnosticsReport,
  extras?: {
    database_ok?: boolean;
    storage_ok?: boolean;
    integrations_ok?: boolean;
  },
): { id: string; label: string; status: DiagnosticStatus }[] {
  const pick = (id: string) => auth.checks.find((c) => c.id === id)?.status ?? "warn";

  return [
    { id: "app_url", label: "APP_URL", status: pick("app_url") },
    { id: "site_url", label: "Site URL", status: pick("site_url") },
    { id: "redirect", label: "Redirect URLs", status: pick("invite_redirect") },
    { id: "supabase", label: "Supabase", status: pick("supabase_client") },
    { id: "auth", label: "Auth", status: pick("supabase_auth") },
    { id: "invites", label: "Convites", status: auth.invites_allowed ? "ok" : "error" },
    { id: "smtp", label: "SMTP", status: pick("smtp") },
    {
      id: "storage",
      label: "Storage",
      status: extras?.storage_ok === false ? "error" : extras?.storage_ok ? "ok" : "warn",
    },
    {
      id: "database",
      label: "Database",
      status: extras?.database_ok === false ? "error" : extras?.database_ok ? "ok" : "warn",
    },
    {
      id: "integrations",
      label: "Integrações",
      status: extras?.integrations_ok === false ? "warn" : extras?.integrations_ok ? "ok" : "warn",
    },
  ];
}
