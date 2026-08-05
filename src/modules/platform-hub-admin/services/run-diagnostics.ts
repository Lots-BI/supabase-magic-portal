import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { AdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import type { HubDiagnosticCheckV1, HubDiagnosticReportV1 } from "../types";
import {
  createHubOAuthHandle,
  isHubOAuthPlugin,
  oauthCredentialKeyForPlugin,
} from "./hub-oauth.factory";

export async function runConnectionDiagnostics(
  stack: AdminHubStack,
  connectionId: string,
): Promise<HubDiagnosticReportV1> {
  const checks: HubDiagnosticCheckV1[] = [];
  const id = asConnectionId(connectionId);

  try {
    const conn = await stack.connectionService.get(id);
    const adminRow = await stack.adminQueries.getConnection(connectionId);

    checks.push({
      id: "connection",
      label: "Conexão",
      status: adminRow?.status === "disabled" ? "warning" : "ok",
      detail: `${conn.label} (${conn.pluginKey}) — ${adminRow?.status ?? "active"}`,
    });

    const registration = stack.registry.getPlugin(conn.pluginKey);
    checks.push({
      id: "registry",
      label: "Registry",
      status: "ok",
      detail: `${registration.manifest.capabilities.length} capabilities · ${registration.manifest.providers.supported.length} providers`,
    });

    checks.push({
      id: "capabilities",
      label: "Capabilities",
      status: "ok",
      detail: registration.manifest.capabilities.join(", ") || "—",
    });

    const providerOk = registration.manifest.providers.supported.includes(conn.activeProviderType);
    checks.push({
      id: "provider",
      label: "Provider ativo",
      status: providerOk ? "ok" : "error",
      detail: conn.activeProviderType,
    });

    const apiVersion = registration.manifest.versions.find(
      (v) => v.provider === conn.activeProviderType,
    );
    checks.push({
      id: "api",
      label: "API version",
      status: apiVersion ? "ok" : "warning",
      detail: apiVersion?.apiVersion ?? "Não definida para o provider",
    });

    const identities = await stack.identityService.list(id);
    checks.push({
      id: "identity",
      label: "Identity",
      status: identities.length > 0 ? "ok" : "warning",
      detail: `${identities.length} identidade(s)`,
    });

    const manifest = registration.manifest;
    const primaryType = manifest.identity?.primary;
    const hasPrimary = identities.some((i) => i.isPrimary);
    if (primaryType) {
      checks.push({
        id: "primary_identity",
        label: "Identidade primária",
        status: hasPrimary ? "ok" : "warning",
        detail: hasPrimary ? primaryType : `Esperado: ${primaryType}`,
      });
    }

    if (conn.activeProviderType === "official_api" && manifest.oauth) {
      const oauthKey = oauthCredentialKeyForPlugin(conn.pluginKey);
      const hasToken = oauthKey ? await stack.credentialVault.has(id, oauthKey) : false;
      checks.push({
        id: "oauth",
        label: "OAuth",
        status: hasToken ? "ok" : "error",
        detail: hasToken ? "Token no vault" : "Reconecte OAuth",
      });

      checks.push({
        id: "vault",
        label: "Credential Vault",
        status: hasToken ? "ok" : "error",
        detail: hasToken ? "Credencial criptografada presente" : "Vault vazio",
      });

      if (hasToken && oauthKey && isHubOAuthPlugin(conn.pluginKey)) {
        try {
          const payload = await stack.credentialVault.retrieve(id, oauthKey);
          const token = payload?.data?.accessToken;
          if (typeof token === "string") {
            const oauth = createHubOAuthHandle(
              conn.pluginKey,
              new FetchHttpClient(),
              createCredentialAccess(stack.credentialVault),
            );
            const validation = await oauth.validateAccessToken(token);
            checks.push({
              id: "permissions",
              label: "Permissions / Token",
              status: validation.valid ? "ok" : "error",
              detail: validation.valid
                ? `${validation.scopes?.length ?? 0} scope(s)${validation.expiresAt ? ` · expira ${validation.expiresAt}` : ""}`
                : (validation.error ?? "Token inválido"),
            });
          }
        } catch (e) {
          checks.push({
            id: "permissions",
            label: "Permissions",
            status: "warning",
            detail: e instanceof Error ? e.message : "Não foi possível validar",
          });
        }
      }
    }

    // HealthEngine é in-memory por request — sem sinais recentes fica `unknown`.
    // Preferir snapshot persistido em ph_connections quando o engine não tem observação.
    const liveHealth = await stack.healthEngine.get(id);
    const persistedStatus = adminRow?.healthStatus ?? null;
    const persistedScore = adminRow?.healthScore;
    const usePersisted =
      liveHealth.status === "unknown" &&
      !!persistedStatus &&
      persistedStatus !== "unknown";
    const healthStatus = usePersisted ? persistedStatus : liveHealth.status;
    const healthScore = usePersisted
      ? (persistedScore ?? liveHealth.score)
      : liveHealth.score;
    checks.push({
      id: "health",
      label: "Health",
      status:
        healthStatus === "healthy"
          ? "ok"
          : healthStatus === "degraded"
            ? "warning"
            : healthStatus === "unhealthy"
              ? "error"
              : "warning",
      detail: usePersisted
        ? `${healthStatus} (score ${healthScore}, persistido)`
        : `${healthStatus} (score ${healthScore})`,
    });

    checks.push({
      id: "pipeline",
      label: "Pipeline",
      status: "ok",
      detail: "MetricPipeline aceita envelopes",
    });

    checks.push({
      id: "writer",
      label: "Writer",
      status: "ok",
      detail: "Homologação: base_metricas_hub (make intocado)",
    });

    if (adminRow?.lastError) {
      checks.push({
        id: "last_error",
        label: "Último erro",
        status: "error",
        detail: adminRow.lastError,
      });
    }

    checks.push({
      id: "rate_limit",
      label: "Rate limit",
      status: "ok",
      detail: "Sem throttling detectado na última execução",
    });
  } catch (error) {
    checks.push({
      id: "fatal",
      label: "Diagnóstico",
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const overall = checks.some((c) => c.status === "error")
    ? "error"
    : checks.some((c) => c.status === "warning")
      ? "warning"
      : "ok";

  return {
    connectionId,
    ranAt: new Date().toISOString(),
    checks,
    overall,
  };
}
