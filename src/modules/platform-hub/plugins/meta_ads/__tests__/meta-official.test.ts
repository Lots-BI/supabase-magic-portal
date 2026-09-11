import { describe, expect, it } from "vitest";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../../../contracts/credential/credential-vault.v1";
import { asScopeRef } from "../../../../../../contracts/connection/scope-ref.v1";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { createRuntimeStack } from "@/modules/platform-hub/runtime/create-runtime-stack";
import { MockHttpClient } from "../../_internal/http/mock-http-client";
import { createCredentialAccess } from "../../_internal/oauth/credential-access.port";
import { META_OAUTH_CREDENTIAL_KEY } from "../meta-credential-keys";
import { MetaOAuthService } from "../oauth/meta-oauth.service";
import {
  createOfficialMetaProvider,
  META_PLATFORM_LABEL,
} from "../providers/official-meta.provider";
import { runDualRunComparison } from "../../_internal/dual-run/dual-run.service";
import { createConnectionResolver } from "@/modules/platform-hub/connections/create-connection-resolver";
import { withHttpRetry } from "../../_internal/http/retry-http";
import { HttpClientError } from "../../_internal/http/http-client.port";

const SAMPLE_INSIGHTS = {
  data: [
    {
      campaign_name: "Campanha A",
      date_start: "2026-07-01",
      date_stop: "2026-07-01",
      impressions: "1000",
      reach: "800",
      clicks: "50",
      spend: "25.50",
    },
  ],
};

function metaInsightsMock() {
  return new MockHttpClient([
    {
      match: (url) => url.includes("/insights"),
      respond: () => ({ body: SAMPLE_INSIGHTS }),
    },
  ]);
}

describe("OfficialMetaProvider", () => {
  it("produz IngestEnvelope compatível com MetricPipeline", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "meta_ads",
      label: "Meta official",
      scopeRef: asScopeRef("cadastro:42"),
      activeProviderType: "official_api",
    });

    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "ad_account",
      externalId: "act_123456",
      label: "Conta principal",
      isPrimary: true,
    });

    await stack.credentialVault.store(connection.connectionId, META_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "token-test" },
    });

    const provider = createOfficialMetaProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient: metaInsightsMock(),
    });
    const envelope = await provider.collect({
      connectionId: connection.connectionId,
      capability: "meta:metrics:collect",
      identities: await stack.identityService.list(connection.connectionId),
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(envelope.profile).toBe("metrics-timeseries");
    expect(envelope.payload.platformLabel).toBe(META_PLATFORM_LABEL);
    expect(envelope.payload.rows).toHaveLength(11);
    expect(envelope.payload.rows.find((row) => row.metricKey === "spend")?.value).toBe(25.5);
    expect(envelope.payload.rows.find((row) => row.metricKey === "results")?.value).toBe(0);

    const pipeline = createMetricPipelineStack();
    const pipelineResult = await pipeline.metricPipeline.accept(envelope);
    expect(pipelineResult.accepted).toBe(true);
  });

  it("pagina insights via cursor", async () => {
    let callCount = 0;
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("/insights"),
        respond: () => {
          callCount += 1;
          if (callCount === 1) {
            return {
              body: {
                data: [
                  {
                    campaign_name: "P1",
                    date_start: "2026-07-01",
                    date_stop: "2026-07-01",
                    impressions: "10",
                  },
                ],
                paging: { cursors: { after: "cursor-2" } },
              },
            };
          }
          return {
            body: {
              data: [
                {
                  campaign_name: "P2",
                  date_start: "2026-07-01",
                  date_stop: "2026-07-01",
                  impressions: "20",
                },
              ],
            },
          };
        },
      },
    ]);

    const stack = createConnectionStack();
    const provider = createOfficialMetaProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient,
    });

    const connectionId = "00000000-0000-4000-8000-000000000010" as never;
    await stack.credentialVault.store(connectionId, META_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "token-test" },
    });

    const envelope = await provider.collect({
      connectionId,
      capability: "meta:metrics:collect",
      identities: [
        {
          version: "1.0.0",
          connectionId,
          identityType: "ad_account",
          externalId: "123",
          label: "Ad",
          isPrimary: true,
        },
      ],
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(callCount).toBe(2);
    expect(envelope.payload.rows.filter((row) => row.campaign === "P1").length).toBeGreaterThan(0);
    expect(envelope.payload.rows.filter((row) => row.campaign === "P2").length).toBeGreaterThan(0);
    expect(envelope.payload.rows).toHaveLength(16);
  });

  it("falha autenticação quando token ausente", async () => {
    const stack = createConnectionStack();
    const provider = stack.registry.getPlugin("meta_ads").adapter.getProvider("official_api");

    await expect(
      provider.collect({
        connectionId: "00000000-0000-4000-8000-000000000011" as never,
        capability: "meta:metrics:collect",
        identities: [
          {
            version: "1.0.0",
            connectionId: "00000000-0000-4000-8000-000000000011" as never,
            identityType: "ad_account",
            externalId: "act_1",
            label: "Ad",
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toThrow(/access token not found/i);
  });

  it("propaga erro 401 da Graph API", async () => {
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("/insights"),
        respond: () => ({ status: 401, body: { error: { message: "Invalid OAuth token" } } }),
      },
    ]);

    const stack = createConnectionStack();
    const provider = createOfficialMetaProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient,
    });

    const connectionId = "00000000-0000-4000-8000-000000000012" as never;
    await stack.credentialVault.store(connectionId, META_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "bad-token" },
    });

    await expect(
      provider.collect({
        connectionId,
        capability: "meta:metrics:collect",
        identities: [
          {
            version: "1.0.0",
            connectionId,
            identityType: "ad_account",
            externalId: "act_1",
            label: "Ad",
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("MetaOAuthService", () => {
  it("monta authorization URL com escopos", () => {
    const stack = createConnectionStack();
    const oauth = new MetaOAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      metaInsightsMock(),
      createCredentialAccess(stack.credentialVault),
    );

    const url = oauth.buildAuthorizationUrl({
      redirectUri: "https://app/callback",
      state: "state-1",
    });

    expect(url).toContain("client_id=app-id");
    expect(url).toContain("ads_read");
    expect(url).toContain("auth_type=rerequest");
  });

  it("exchange code persiste token no vault", async () => {
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("/oauth/access_token") && !url.includes("debug_token"),
        respond: () => ({
          body: { access_token: "long-lived", token_type: "bearer", expires_in: 3600 },
        }),
      },
      {
        match: (url) => url.includes("/debug_token"),
        respond: () => ({
          body: { data: { is_valid: true, scopes: ["instagram_content_publish", "pages_manage_posts"] } },
        }),
      },
    ]);

    const stack = createConnectionStack();
    const oauth = new MetaOAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      httpClient,
      createCredentialAccess(stack.credentialVault),
    );

    const connectionId = "00000000-0000-4000-8000-000000000013" as never;
    const bundle = await oauth.exchangeCodeForToken({
      connectionId,
      code: "auth-code",
      redirectUri: "https://app/callback",
    });

    expect(bundle.accessToken).toBe("long-lived");
    const stored = await stack.credentialVault.retrieve(connectionId, META_OAUTH_CREDENTIAL_KEY);
    expect(stored?.data.accessToken).toBe("long-lived");
  });

  it("refresh token via fb_exchange_token", async () => {
    const httpClient = new MockHttpClient([
      {
        match: (url) =>
          url.includes("grant_type=fb_exchange_token") || url.includes("fb_exchange_token"),
        respond: () => ({
          body: { access_token: "refreshed", expires_in: 7200 },
        }),
      },
    ]);

    const stack = createConnectionStack();
    const connectionId = "00000000-0000-4000-8000-000000000014" as never;
    await stack.credentialVault.store(connectionId, META_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "old-token" },
    });

    const oauth = new MetaOAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      httpClient,
      createCredentialAccess(stack.credentialVault),
    );

    const bundle = await oauth.refreshAccessToken(connectionId);
    expect(bundle.accessToken).toBe("refreshed");
  });

  it("valida token via debug_token", async () => {
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("/debug_token"),
        respond: () => ({
          body: { data: { is_valid: true, expires_at: 1893456000, scopes: ["ads_read"] } },
        }),
      },
    ]);

    const stack = createConnectionStack();
    const oauth = new MetaOAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      httpClient,
      createCredentialAccess(stack.credentialVault),
    );

    const validation = await oauth.validateAccessToken("token");
    expect(validation.valid).toBe(true);
    expect(validation.scopes).toContain("ads_read");
  });
});

describe("Meta dual-run", () => {
  it("compara Make baseline vs Official", async () => {
    const stack = createConnectionStack();
    const resolver = createConnectionResolver(stack.bridge);
    const adapter = stack.registry.getPlugin("meta_ads").adapter;

    const connectionId = "00000000-0000-4000-8000-000000000015" as never;
    stack.bridge.registerConnection(connectionId, asScopeRef("cadastro:42"));

    const identities = [
      {
        version: "1.0.0" as const,
        connectionId,
        identityType: "ad_account" as const,
        externalId: "act_999",
        label: "Ad",
        isPrimary: true,
      },
    ];

    await stack.credentialVault.store(connectionId, META_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "token-test" },
    });

    const officialProvider = createOfficialMetaProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient: metaInsightsMock(),
    });

    const result = await runDualRunComparison({
      connectionId,
      capability: "meta:metrics:collect",
      identities,
      resolver,
      makeProvider: adapter.getProvider("make_passive"),
      officialProvider,
      makeBaselineRows: [
        {
          cliente: "Cliente Demo",
          plataforma: "Meta Ads",
          metrica: "impressions",
          valor: 1000,
          data: "2026-07-01",
          campanha: "Campanha A",
        },
        {
          cliente: "Cliente Demo",
          plataforma: "Meta Ads",
          metrica: "spend",
          valor: 25.5,
          data: "2026-07-01",
          campanha: "Campanha A",
        },
      ],
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(result.report.matchedRows).toBeGreaterThan(0);
    expect(result.report.valueMismatches).toBe(0);
  });
});

describe("Meta HTTP retry", () => {
  it("retenta rate limit", async () => {
    let attempts = 0;
    const result = await withHttpRetry(async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new HttpClientError("rate limited", 429);
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });
});

describe("Meta official E2E via Runtime", () => {
  it("syncRuntime.execute com official_api", async () => {
    const stack = createRuntimeStack();
    const pipeline = createMetricPipelineStack();

    const connection = await stack.connectionService.create({
      pluginKey: "meta_ads",
      label: "Meta runtime",
      scopeRef: asScopeRef("cadastro:42"),
      activeProviderType: "official_api",
    });

    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "business",
      externalId: "biz_1",
      label: "Business",
    });
    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "ad_account",
      externalId: "act_777",
      label: "Ad Account",
      isPrimary: true,
    });
    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "page",
      externalId: "page_1",
      label: "Page",
    });
    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "instagram",
      externalId: "ig_1",
      label: "Instagram",
    });

    await stack.credentialVault.store(connection.connectionId, META_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "manual-token" },
    });

    const registration = stack.registry.getPlugin("meta_ads");
    const originalGetProvider = registration.adapter.getProvider.bind(registration.adapter);
    registration.adapter.getProvider = (providerType: string) => {
      if (providerType === "official_api") {
        return createOfficialMetaProvider({
          credentialAccess: createCredentialAccess(stack.credentialVault),
          httpClient: metaInsightsMock(),
        });
      }
      return originalGetProvider(providerType);
    };

    const result = await stack.syncRuntime.execute(connection.connectionId);
    expect(result.status).toBe("success");

    const pipelineResult = await pipeline.metricPipeline.accept(result.envelope!);
    expect(pipelineResult.accepted).toBe(true);
    expect(result.envelope?.payload.rows.length).toBeGreaterThan(0);

    const health = await stack.healthEngine.get(connection.connectionId);
    expect(health.status).toBe("healthy");
  });
});
