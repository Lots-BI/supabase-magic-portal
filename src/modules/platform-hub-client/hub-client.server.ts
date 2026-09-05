import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { asConnectionId } from "../../../contracts/connection/connection-id.v1";
import { asScopeRef } from "../../../contracts/connection/scope-ref.v1";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveServerAppUrl } from "@/lib/app-url.server";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { assertClientPortalAccess } from "@/modules/approval/internal/client-access.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { registerCadastroRecord } from "@/modules/platform-hub-bridges/legacy-cadastro";
import { discoverIdentitiesForPlugin } from "@/modules/platform-hub-bridges/ph-persistence/services/discover-identities";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import {
  createHubOAuthHandle,
  oauthCredentialKeyForPlugin,
} from "@/modules/platform-hub-admin/services/hub-oauth.factory";
import { sanitizeOAuthRedirectAfter } from "@/modules/platform-hub-admin/services/sanitize-redirect";

/**
 * Plugins liberados para autoatendimento do cliente (aba "Conexões" do portal).
 * Apenas o que está confirmado funcionando ponta a ponta — expandir aqui quando
 * outras plataformas forem validadas para o cliente conectar sozinho.
 */
export const CLIENT_SELF_SERVICE_PLUGIN_KEYS = ["instagram_organic", "meta_ads"] as const;
export type ClientSelfServicePluginKey = (typeof CLIENT_SELF_SERVICE_PLUGIN_KEYS)[number];

export const CLIENT_SELF_SERVICE_PLUGIN_LABELS: Record<ClientSelfServicePluginKey, string> = {
  instagram_organic: "Instagram",
  meta_ads: "Meta Ads",
};

/** Tipo de identidade "principal" (isPrimary) por plugin — usado ao vincular contas. */
export const CLIENT_SELF_SERVICE_PRIMARY_IDENTITY_TYPE: Record<ClientSelfServicePluginKey, string> =
  {
    instagram_organic: "instagram",
    meta_ads: "ad_account",
  };

function assertSelfServicePlugin(pluginKey: string): ClientSelfServicePluginKey {
  if (!(CLIENT_SELF_SERVICE_PLUGIN_KEYS as readonly string[]).includes(pluginKey)) {
    throw new Error("Plataforma não disponível para autoatendimento do cliente");
  }
  return pluginKey as ClientSelfServicePluginKey;
}

type AuthCtx = {
  supabase: SupabaseClient;
  userId: string;
  claims?: { email?: string | null };
};

/** Mesmo padrão de instagram-posts.server.ts: admin (para suporte/testes) ou dono do cadastro. */
async function assertOwnCadastroAccess(ctx: AuthCtx, cadastroClienteId: number): Promise<void> {
  const isAdmin = await resolveIsAdmin({
    supabase: ctx.supabase,
    userId: ctx.userId,
    email: ctx.claims?.email ?? undefined,
    repair: true,
  });
  if (isAdmin) return;

  const scope = await assertClientPortalAccess(ctx);
  if (!scope.cadastroClienteIds.includes(cadastroClienteId)) {
    throw new Error("Sem permissão para este cliente");
  }
}

async function findOwnConnection(cadastroClienteId: number, pluginKey: ClientSelfServicePluginKey) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ph_connections")
    .select("id, plugin_key, status, active_provider_type, label")
    .eq("cadastro_id", cadastroClienteId)
    .eq("plugin_key", pluginKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Garante que connectionId pertence de fato ao cadastro informado (evita cross-client). */
async function assertConnectionBelongsToCadastro(
  cadastroClienteId: number,
  connectionId: string,
): Promise<{ id: string; plugin_key: ClientSelfServicePluginKey }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ph_connections")
    .select("id, plugin_key, cadastro_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.cadastro_id !== cadastroClienteId) {
    throw new Error("Conexão não pertence a este cliente");
  }
  const pluginKey = assertSelfServicePlugin(data.plugin_key);
  return { id: data.id, plugin_key: pluginKey };
}

const cadastroInputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
});

const pluginInputSchema = cadastroInputSchema.extend({
  pluginKey: z.enum(CLIENT_SELF_SERVICE_PLUGIN_KEYS),
});

export const getClientConnectionStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pluginInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOwnCadastroAccess(context, data.cadastroClienteId);

    const connection = await findOwnConnection(data.cadastroClienteId, data.pluginKey);
    if (!connection) {
      return { connected: false as const };
    }

    const stack = await createAdminHubStack(getSupabaseAdmin());
    const identities = await stack.identityService.list(asConnectionId(connection.id));

    return {
      connected: true as const,
      connectionId: connection.id,
      status: connection.status,
      label: connection.label,
      identities: identities.map((identity) => ({
        identityType: identity.identityType,
        externalId: identity.externalId,
        label: identity.label,
        isPrimary: identity.isPrimary,
      })),
    };
  });

export const createClientConnectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pluginInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOwnCadastroAccess(context, data.cadastroClienteId);

    const existing = await findOwnConnection(data.cadastroClienteId, data.pluginKey);
    if (existing) {
      return { connectionId: existing.id };
    }

    const supabase = getSupabaseAdmin();
    const { data: cliente } = await supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastroClienteId)
      .single();
    if (!cliente?.nome_cliente) throw new Error("Cliente não encontrado");

    registerCadastroRecord({
      cadastroId: data.cadastroClienteId,
      nomeCanonico: cliente.nome_cliente,
    });

    const stack = await createAdminHubStack(supabase);
    const scopeRef = asScopeRef(`cadastro:${data.cadastroClienteId}`);
    const label = `${CLIENT_SELF_SERVICE_PLUGIN_LABELS[data.pluginKey]} — ${cliente.nome_cliente}`;
    const conn = await stack.connectionService.create({
      pluginKey: data.pluginKey as never,
      label,
      scopeRef,
      activeProviderType: "official_api",
    });

    await stack.timeline.append({
      connectionId: conn.connectionId,
      cadastroId: data.cadastroClienteId,
      kind: "connection_created",
      title: "Conexão criada pelo cliente (autoatendimento)",
      actorEmail: context.claims?.email ?? undefined,
      metadata: { pluginKey: data.pluginKey, provider: "official_api" },
    });

    return { connectionId: conn.connectionId };
  });

export const startClientOAuthFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        connectionId: z.string().uuid(),
        redirectAfter: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnCadastroAccess(context, data.cadastroClienteId);
    const own = await assertConnectionBelongsToCadastro(data.cadastroClienteId, data.connectionId);

    const stack = await createAdminHubStack(getSupabaseAdmin());
    const conn = await stack.connectionService.get(asConnectionId(data.connectionId));

    const state = randomBytes(24).toString("hex");
    await stack.oauthStates.create({
      state,
      connectionId: data.connectionId,
      pluginKey: conn.pluginKey,
      redirectAfter: sanitizeOAuthRedirectAfter(data.redirectAfter),
    });
    const oauth = createHubOAuthHandle(
      own.plugin_key,
      new FetchHttpClient(),
      createCredentialAccess(stack.credentialVault),
    );
    const redirectUri = `${resolveServerAppUrl()}${oauth.callbackPath}`;
    const url = oauth.buildAuthorizationUrl({ redirectUri, state });
    return { authorizationUrl: url };
  });

export const discoverClientIdentitiesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        connectionId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnCadastroAccess(context, data.cadastroClienteId);
    const own = await assertConnectionBelongsToCadastro(data.cadastroClienteId, data.connectionId);

    const stack = await createAdminHubStack(getSupabaseAdmin());
    const credentialKey = oauthCredentialKeyForPlugin(own.plugin_key);
    if (!credentialKey) throw new Error("Credencial OAuth não configurada");
    const tokenPayload = await stack.credentialVault.retrieve(
      asConnectionId(data.connectionId),
      credentialKey,
    );
    const accessToken = tokenPayload?.data?.accessToken;
    if (!accessToken || typeof accessToken !== "string") {
      throw new Error(
        `Faça login com ${CLIENT_SELF_SERVICE_PLUGIN_LABELS[own.plugin_key]} antes de listar contas`,
      );
    }
    return discoverIdentitiesForPlugin(new FetchHttpClient(), own.plugin_key, accessToken);
  });

export const attachClientIdentityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cadastroClienteId: z.number().int().positive(),
        connectionId: z.string().uuid(),
        identities: z
          .array(
            z.object({
              identityType: z.string().min(1),
              externalId: z.string().min(1),
              label: z.string().min(1),
              parentLabel: z.string().optional(),
              isPrimary: z.boolean().optional(),
            }),
          )
          .min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnCadastroAccess(context, data.cadastroClienteId);
    const own = await assertConnectionBelongsToCadastro(data.cadastroClienteId, data.connectionId);

    const stack = await createAdminHubStack(getSupabaseAdmin());
    const connectionId = asConnectionId(data.connectionId);
    const primaryType = CLIENT_SELF_SERVICE_PRIMARY_IDENTITY_TYPE[own.plugin_key];
    let primaryAssigned = false;
    for (const identity of data.identities) {
      const isPrimary =
        identity.isPrimary ?? (primaryType === identity.identityType && !primaryAssigned);
      if (isPrimary) primaryAssigned = true;
      await stack.identityService.attach({
        connectionId,
        identityType: identity.identityType as never,
        externalId: identity.externalId,
        label: identity.label,
        isPrimary,
      });
    }

    await stack.timeline.append({
      connectionId: data.connectionId,
      kind: "identity_attached",
      title: `${data.identities.length} identidade(s) vinculada(s) pelo cliente`,
      actorEmail: context.claims?.email ?? undefined,
    });

    return { ok: true, count: data.identities.length };
  });
