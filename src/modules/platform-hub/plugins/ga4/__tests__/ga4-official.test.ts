import { describe, expect, it } from "vitest";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../../../contracts/credential/credential-vault.v1";
import { asScopeRef } from "../../../../../../contracts/connection/scope-ref.v1";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { MockHttpClient } from "../../_internal/http/mock-http-client";
import { createCredentialAccess } from "../../_internal/oauth/credential-access.port";
import { GA4_OAUTH_CREDENTIAL_KEY } from "../ga4-credential-keys";
import { Ga4OAuthService } from "../oauth/ga4-oauth.service";
import { createOfficialGa4Provider, GA4_PLATFORM_LABEL } from "../providers/official-ga4.provider";

const SAMPLE_REPORT = {
  rows: [
    {
      dimensionValues: [{ value: "20260701" }],
      metricValues: [
        { value: "500" },
        { value: "700" },
        { value: "400" },
        { value: "1200" },
        { value: "3000" },
        { value: "12" },
      ],
    },
  ],
};

function ga4Mock() {
  return new MockHttpClient([
    {
      match: (url) => url.includes(":runReport"),
      respond: () => ({ body: SAMPLE_REPORT }),
    },
  ]);
}

describe("OfficialGa4Provider", () => {
  it("produz IngestEnvelope compatível com MetricPipeline", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "ga4",
      label: "GA4 official",
      scopeRef: asScopeRef("cadastro:42"),
      activeProviderType: "official_api",
    });

    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "property",
      externalId: "123456789",
      label: "Property",
      isPrimary: true,
    });

    await stack.credentialVault.store(connection.connectionId, GA4_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "token-test" },
    });

    const provider = createOfficialGa4Provider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient: ga4Mock(),
    });

    const envelope = await provider.collect({
      connectionId: connection.connectionId,
      capability: "ga4:metrics:collect",
      identities: await stack.identityService.list(connection.connectionId),
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(envelope.payload.platformLabel).toBe(GA4_PLATFORM_LABEL);
    expect(envelope.payload.rows).toHaveLength(6);
    expect(envelope.payload.rows.find((row) => row.metricKey === "activeusers")?.value).toBe(500);

    const pipeline = createMetricPipelineStack();
    expect((await pipeline.metricPipeline.accept(envelope)).accepted).toBe(true);
  });
});

describe("Ga4OAuthService", () => {
  it("monta authorization URL com escopos analytics", () => {
    const stack = createConnectionStack();
    const oauth = new Ga4OAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      ga4Mock(),
      createCredentialAccess(stack.credentialVault),
    );

    const url = oauth.buildAuthorizationUrl({
      redirectUri: "https://app/callback",
      state: "state-1",
    });

    expect(url).toContain("analytics.readonly");
  });
});
