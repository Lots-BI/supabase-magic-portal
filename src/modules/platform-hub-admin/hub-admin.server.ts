import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { asScopeRef } from "../../../contracts/connection/scope-ref.v1";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../contracts/credential/credential-vault.v1";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveServerAppUrl } from "@/lib/app-url.server";
import {
  assertAgencyOsAdmin,
  actorEmailFromClaims,
} from "@/modules/agency-os/internal/assert-admin.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { registerCadastroRecord } from "@/modules/platform-hub-bridges/legacy-cadastro";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { isMetricsTimeseriesEnvelope } from "../../../contracts/ingest/ingest-envelope.v1";
import { buildPlatformCatalog } from "./services/build-catalog";
import { runConnectionDiagnostics } from "./services/run-diagnostics";
import {
  attachIdentitySchema,
  batchAttachIdentitiesSchema,
  connectionIdSchema,
  createConnectionWizardSchema,
  credentialKeySchema,
  hubConnectionsFiltersSchema,
  startOAuthSchema,
  storeCredentialSchema,
  switchProviderSchema,
  updateConnectionSchema,
  updateMigrationStageSchema,
} from "./validators";
import {
  discoverIdentitiesForPlugin,
  supportsIdentityDiscovery,
} from "@/modules/platform-hub-bridges/ph-persistence/services/discover-identities";
import {
  createHubOAuthHandle,
  isHubOAuthPlugin,
  oauthCredentialKeyForPlugin,
} from "./services/hub-oauth.factory";
import { sanitizeOAuthRedirectAfter } from "./services/sanitize-redirect";

async function adminStack() {
  return createAdminHubStack(getSupabaseAdmin());
}

export const getHubOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const overview = await stack.adminQueries.getOverview();
    const connections = await stack.adminQueries.listConnections();
    const stats = new Map<string, { count: number; avgHealth: number | null }>();
    for (const c of connections) {
      const prev = stats.get(c.pluginKey) ?? { count: 0, avgHealth: null };
      stats.set(c.pluginKey, {
        count: prev.count + 1,
        avgHealth:
          c.healthScore !== null
            ? Math.round(((prev.avgHealth ?? 0) * prev.count + c.healthScore) / (prev.count + 1))
            : prev.avgHealth,
      });
    }
    const catalog = buildPlatformCatalog(
      new Map(
        [...stats.entries()].map(([k, v]) => [k, { count: v.count, avgHealth: v.avgHealth }]),
      ),
    );
    const timeline = await stack.timeline.listRecent(30);
    return { overview, connections, catalog, timeline };
  });

export const getHubConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => hubConnectionsFiltersSchema.optional().parse(d ?? {}))
  .handler(async ({ data: filters, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    return stack.adminQueries.listConnections(filters);
  });

export const getHubConnectionDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const row = await stack.adminQueries.getConnection(data.connectionId);
    if (!row) throw new Error("Conexão não encontrada");
    const id = asConnectionId(data.connectionId);
    const identities = await stack.identityService.list(id);
    const syncRuns = await stack.syncRunRepository.listByConnection(id);
    const health = await stack.healthEngine.get(id);
    const timeline = await stack.timeline.listRecent(50, data.connectionId);
    const credentials = await stack.adminQueries.listCredentialKeys(data.connectionId);
    const registration = stack.registry.getPlugin(row.pluginKey as never);
    return {
      connection: row,
      identities,
      syncRuns,
      health,
      timeline,
      credentials,
      manifest: registration.manifest,
    };
  });

export const getHubCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const connections = await stack.adminQueries.listConnections();
    const stats = new Map<string, { count: number; avgHealth: number | null }>();
    for (const c of connections) {
      const s = stats.get(c.pluginKey) ?? { count: 0, avgHealth: null };
      stats.set(c.pluginKey, {
        count: s.count + 1,
        avgHealth: c.healthScore ?? s.avgHealth,
      });
    }
    return buildPlatformCatalog(stats);
  });

/** Status booleano de secrets OAuth (nunca retorna valores). Para UX do assistente. */
export const getHubOAuthEnvStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const filled = (...keys: string[]) => keys.every((k) => Boolean(process.env[k]?.trim()));
    return {
      appUrl: resolveServerAppUrl() ?? null,
      meta: filled("META_APP_ID", "META_APP_SECRET"),
      google: filled("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"),
      googleAdsDeveloperToken: filled("GOOGLE_ADS_DEVELOPER_TOKEN"),
      tiktok: filled("TIKTOK_APP_ID", "TIKTOK_APP_SECRET"),
      vaultKey: filled("HUB_CREDENTIAL_ENCRYPTION_KEY"),
    };
  });

export const createHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createConnectionWizardSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const supabase = getSupabaseAdmin();
    const { data: cliente } = await supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastroId)
      .single();
    if (!cliente?.nome_cliente) throw new Error("Cliente não encontrado");

    registerCadastroRecord({
      cadastroId: data.cadastroId,
      nomeCanonico: cliente.nome_cliente,
    });

    const stack = await adminStack();
    const scopeRef = asScopeRef(`cadastro:${data.cadastroId}`);
    const conn = await stack.connectionService.create({
      pluginKey: data.pluginKey as never,
      label: data.label,
      scopeRef,
      activeProviderType: data.activeProviderType,
    });

    const manifest = stack.registry.getPlugin(data.pluginKey as never).manifest;
    const apiVersion =
      manifest.versions.find((v) => v.provider === data.activeProviderType)?.apiVersion ?? null;

    await supabase
      .from("ph_connections")
      .update({ api_version: apiVersion })
      .eq("id", conn.connectionId);

    await stack.timeline.append({
      connectionId: conn.connectionId,
      cadastroId: data.cadastroId,
      kind: "connection_created",
      title: `Conexão criada: ${data.label}`,
      actorEmail: actorEmailFromClaims(context.claims),
      metadata: { pluginKey: data.pluginKey, provider: data.activeProviderType },
    });

    return { connectionId: conn.connectionId };
  });

export const startHubOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => startOAuthSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const conn = await stack.connectionService.get(asConnectionId(data.connectionId));
    if (!isHubOAuthPlugin(conn.pluginKey)) {
      throw new Error(`OAuth não configurado para ${conn.pluginKey}`);
    }
    const state = randomBytes(24).toString("hex");
    await stack.oauthStates.create({
      state,
      connectionId: data.connectionId,
      pluginKey: conn.pluginKey,
      redirectAfter: sanitizeOAuthRedirectAfter(data.redirectAfter),
    });
    const oauth = createHubOAuthHandle(
      conn.pluginKey,
      new FetchHttpClient(),
      createCredentialAccess(stack.credentialVault),
    );
    const redirectUri = `${resolveServerAppUrl()}${oauth.callbackPath}`;
    const url = oauth.buildAuthorizationUrl({ redirectUri, state });
    return { authorizationUrl: url };
  });

async function completeHubOAuthFromCallback(data: { code: string; state: string }) {
  const stack = await adminStack();
  const oauthState = await stack.oauthStates.consume(data.state);
  if (!oauthState) throw new Error("State OAuth inválido ou expirado");
  if (!isHubOAuthPlugin(oauthState.pluginKey)) {
    throw new Error(`OAuth inválido para plugin ${oauthState.pluginKey}`);
  }
  const connectionId = asConnectionId(oauthState.connectionId);
  const conn = await stack.connectionService.get(connectionId);
  if (conn.pluginKey !== oauthState.pluginKey) {
    throw new Error("State OAuth não corresponde à plataforma da conexão");
  }
  const oauth = createHubOAuthHandle(
    oauthState.pluginKey,
    new FetchHttpClient(),
    createCredentialAccess(stack.credentialVault),
  );
  const redirectUri = `${resolveServerAppUrl()}${oauth.callbackPath}`;
  try {
    await oauth.exchangeCodeForToken({ connectionId, code: data.code, redirectUri });
    await stack.timeline.append({
      connectionId: oauthState.connectionId,
      kind: "oauth_completed",
      title: `OAuth ${oauthState.pluginKey} concluído`,
    });
  } catch (error) {
    await stack.timeline.append({
      connectionId: oauthState.connectionId,
      kind: "oauth_failed",
      title: `OAuth ${oauthState.pluginKey} falhou`,
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  return {
    redirectAfter: sanitizeOAuthRedirectAfter(oauthState.redirectAfter),
    connectionId: oauthState.connectionId,
  };
}

export const completeHubMetaOAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string(), state: z.string() }).parse(d))
  .handler(async ({ data }) => completeHubOAuthFromCallback(data));

export const completeHubGoogleOAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string(), state: z.string() }).parse(d))
  .handler(async ({ data }) => completeHubOAuthFromCallback(data));

export const completeHubTikTokOAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string(), state: z.string() }).parse(d))
  .handler(async ({ data }) => completeHubOAuthFromCallback(data));

export const storeHubCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeCredentialSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    await stack.credentialVault.store(asConnectionId(data.connectionId), data.credentialKey, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: data.accessToken },
    });
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "credential_updated",
      title: "Credencial atualizada",
      actorEmail: actorEmailFromClaims(context.claims),
    });
    return { ok: true };
  });

export const attachHubIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attachIdentitySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const connectionId = asConnectionId(data.connectionId);
    if (data.isPrimary) {
      await stack.identityService.attach({
        connectionId,
        identityType: data.identityType as never,
        externalId: data.externalId,
        label: data.label,
        isPrimary: true,
      });
    } else {
      await stack.identityService.attach({
        connectionId,
        identityType: data.identityType as never,
        externalId: data.externalId,
        label: data.label,
      });
    }
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "identity_attached",
      title: `Identidade: ${data.label}`,
      actorEmail: actorEmailFromClaims(context.claims),
    });
    return { ok: true };
  });

export const syncHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const connectionId = asConnectionId(data.connectionId);
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "sync_started",
      title: "Sincronização iniciada",
      actorEmail: actorEmailFromClaims(context.claims),
    });
    const result = await stack.manualScheduler.run(connectionId);
    if (result.status === "success" && result.envelope) {
      await stack.metricPipeline.accept(result.envelope);
      const rows = isMetricsTimeseriesEnvelope(result.envelope)
        ? result.envelope.payload.rows.length
        : 0;
      await stack.adminQueries.updateAdminFields(data.connectionId, {
        healthStatus: "healthy",
        healthScore: 90,
      });
      await stack.timeline.append({
        connectionId: data.connectionId,
        kind: "sync_finished",
        title: `Sincronização concluída (${rows} métricas)`,
        metadata: { rows, durationMs: result.durationMs },
      });
    } else {
      await stack.adminQueries.updateAdminFields(data.connectionId, {
        healthStatus: "unhealthy",
        healthScore: 20,
      });
      await stack.timeline.append({
        connectionId: data.connectionId,
        kind: "sync_failed",
        title: "Sincronização falhou",
        detail: result.error,
      });
    }
    const health = await stack.healthEngine.get(connectionId);
    await stack.adminQueries.updateAdminFields(data.connectionId, {
      healthStatus:
        health.status === "healthy"
          ? "healthy"
          : health.status === "degraded"
            ? "degraded"
            : health.status === "unhealthy"
              ? "unhealthy"
              : "unknown",
      healthScore: health.score,
    });
    return result;
  });

export const switchHubProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => switchProviderSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    await stack.connectionService.setActiveProvider(
      asConnectionId(data.connectionId),
      data.activeProviderType,
    );
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "provider_changed",
      title: `Provider: ${data.activeProviderType}`,
      actorEmail: actorEmailFromClaims(context.claims),
    });
    return { ok: true };
  });

export const updateHubMigrationStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateMigrationStageSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    await stack.adminQueries.updateAdminFields(data.connectionId, {
      migrationStage: data.migrationStage,
    });
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "migration_stage_changed",
      title: `Migração: ${data.migrationStage}`,
      actorEmail: actorEmailFromClaims(context.claims),
    });
    return { ok: true };
  });

export const runHubDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const report = await runConnectionDiagnostics(stack, data.connectionId);
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "diagnostic_run",
      title: `Diagnóstico: ${report.overall}`,
      actorEmail: actorEmailFromClaims(context.claims),
      metadata: { checks: report.checks.length },
    });
    return report;
  });

export const deleteHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "connection_deleted",
      title: "Conexão excluída",
      actorEmail: actorEmailFromClaims(context.claims),
    });
    await stack.connectionService.delete(asConnectionId(data.connectionId));
    return { ok: true };
  });

export const getClientHubConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cadastroId: z.number() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    return stack.adminQueries.listConnections({ cadastroId: data.cadastroId });
  });

export const updateHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateConnectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    await stack.adminQueries.updateAdminFields(data.connectionId, {
      ...(data.label ? { label: data.label } : {}),
      ...(data.status ? { status: data.status } : {}),
    });
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "connection_updated",
      title: data.status
        ? `Conexão ${data.status === "active" ? "reativada" : "desativada"}`
        : `Conexão renomeada: ${data.label}`,
      actorEmail: actorEmailFromClaims(context.claims),
    });
    return { ok: true };
  });

export const discoverHubIdentities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const conn = await stack.connectionService.get(asConnectionId(data.connectionId));
    if (!supportsIdentityDiscovery(conn.pluginKey)) {
      throw new Error(`Descoberta automática não disponível para ${conn.pluginKey}`);
    }
    const credentialKey = oauthCredentialKeyForPlugin(conn.pluginKey);
    if (!credentialKey) {
      throw new Error("Credencial OAuth não configurada para esta plataforma");
    }
    const tokenPayload = await stack.credentialVault.retrieve(
      asConnectionId(data.connectionId),
      credentialKey,
    );
    const accessToken = tokenPayload?.data?.accessToken;
    if (!accessToken || typeof accessToken !== "string") {
      throw new Error("Conecte via OAuth antes de listar identidades");
    }
    return discoverIdentitiesForPlugin(new FetchHttpClient(), conn.pluginKey, accessToken);
  });

/** @deprecated Use discoverHubIdentities */
export const discoverHubMetaIdentities = discoverHubIdentities;

export const batchAttachHubIdentities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => batchAttachIdentitiesSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const connectionId = asConnectionId(data.connectionId);
    for (const identity of data.identities) {
      if (identity.isPrimary) {
        await stack.identityService.attach({
          connectionId,
          identityType: identity.identityType as never,
          externalId: identity.externalId,
          label: identity.label,
          isPrimary: true,
        });
      } else {
        await stack.identityService.attach({
          connectionId,
          identityType: identity.identityType as never,
          externalId: identity.externalId,
          label: identity.label,
        });
      }
    }
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "identity_attached",
      title: `${data.identities.length} identidade(s) vinculada(s)`,
      actorEmail: actorEmailFromClaims(context.claims),
    });
    return { ok: true, count: data.identities.length };
  });

export const listHubCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectionIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const keys = await stack.adminQueries.listCredentialKeys(data.connectionId);
    const enriched = await Promise.all(
      keys.map(async (k) => ({
        ...k,
        present: await stack.credentialVault.has(
          asConnectionId(data.connectionId),
          k.credentialKey,
        ),
      })),
    );
    return enriched;
  });

export const revokeHubCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => credentialKeySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const connectionId = asConnectionId(data.connectionId);
    const conn = await stack.connectionService.get(connectionId);
    const oauthKey = oauthCredentialKeyForPlugin(conn.pluginKey);
    if (isHubOAuthPlugin(conn.pluginKey) && oauthKey === data.credentialKey) {
      const oauth = createHubOAuthHandle(
        conn.pluginKey,
        new FetchHttpClient(),
        createCredentialAccess(stack.credentialVault),
      );
      await oauth.revokeConnectionToken(connectionId);
    } else {
      await stack.credentialVault.delete(connectionId, data.credentialKey);
    }
    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "credential_updated",
      title: `Credencial revogada: ${data.credentialKey}`,
      actorEmail: actorEmailFromClaims(context.claims),
    });
    return { ok: true };
  });

export const testHubCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => credentialKeySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const connectionId = asConnectionId(data.connectionId);
    const payload = await stack.credentialVault.retrieve(connectionId, data.credentialKey);
    if (!payload?.data?.accessToken || typeof payload.data.accessToken !== "string") {
      return { ok: false, detail: "Credencial ausente" };
    }
    const conn = await stack.connectionService.get(connectionId);
    if (!isHubOAuthPlugin(conn.pluginKey)) {
      return { ok: true, detail: "Credencial presente (validação manual)" };
    }
    const oauthKey = oauthCredentialKeyForPlugin(conn.pluginKey);
    if (oauthKey !== data.credentialKey) {
      return { ok: true, detail: "Credencial presente" };
    }
    const oauth = createHubOAuthHandle(
      conn.pluginKey,
      new FetchHttpClient(),
      createCredentialAccess(stack.credentialVault),
    );
    const validation = await oauth.validateAccessToken(payload.data.accessToken);
    return {
      ok: validation.valid,
      detail: validation.valid
        ? `Token válido${validation.expiresAt ? ` até ${validation.expiresAt}` : ""}`
        : (validation.error ?? "Token inválido"),
      expiresAt: validation.expiresAt,
      scopes: validation.scopes,
    };
  });

export const getHubAgencyAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    return stack.adminQueries.getAgencyAlerts();
  });

export const getHubOperationalSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgencyOsAdmin(context);
    const stack = await adminStack();
    const [overview, connections, timeline, alerts] = await Promise.all([
      stack.adminQueries.getOverview(),
      stack.adminQueries.listConnections(),
      stack.timeline.listRecent(20),
      stack.adminQueries.getAgencyAlerts(),
    ]);
    return { overview, connections, timeline, alerts };
  });
