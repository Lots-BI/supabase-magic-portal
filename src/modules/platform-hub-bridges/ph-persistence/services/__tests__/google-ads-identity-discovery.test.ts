import { afterEach, describe, expect, it } from "vitest";
import { MockHttpClient } from "@/modules/platform-hub/plugins/_internal/http/mock-http-client";
import { GOOGLE_ADS_REST_API_VERSION } from "@/modules/platform-hub/plugins/google_ads/api/google-ads-api-version";
import { withGoogleAdsManagerParents } from "../google-ads-identity-attach";
import { discoverGoogleAdsIdentities } from "../google-ads-identity-discovery";

const DEV_TOKEN = "dev-token-test";
const HTML_404 = "<!DOCTYPE html> <html lang=en> <title>Error 404 (Not Found)!!1</title>";

afterEach(() => {
  delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
});

describe("discoverGoogleAdsIdentities", () => {
  it("usa a versão REST vigente e lista customers acessíveis", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("customers:listAccessibleCustomers"),
        respond: (url) => {
          expect(url).toContain(`/googleads.googleapis.com/${GOOGLE_ADS_REST_API_VERSION}/`);
          return { body: { resourceNames: ["customers/1234567890"] } };
        },
      },
      {
        match: (url) => url.includes("googleAds:search"),
        respond: (_url, init) => {
          expect(init?.headers?.["login-customer-id"]).toBeUndefined();
          return {
            body: {
              results: [
                {
                  customer: {
                    id: "1234567890",
                    descriptiveName: "Conta cliente",
                    manager: false,
                  },
                },
              ],
            },
          };
        },
      },
    ]);

    const identities = await discoverGoogleAdsIdentities(http, "token", DEV_TOKEN);
    expect(identities).toEqual([
      { identityType: "customer", externalId: "1234567890", label: "Conta cliente" },
    ]);
  });

  it("expande clientes da MCC com parentExternalId", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("customers:listAccessibleCustomers"),
        respond: () => ({ body: { resourceNames: ["customers/999"] } }),
      },
      {
        match: (url, init) =>
          url.includes("/customers/999/googleAds:search") &&
          Boolean(init?.body?.includes("FROM customer WHERE")),
        respond: () => ({
          body: {
            results: [{ customer: { id: "999", descriptiveName: "Lots MCC", manager: true } }],
          },
        }),
      },
      {
        match: (url, init) =>
          url.includes("/customers/999/googleAds:search") &&
          Boolean(init?.body?.includes("FROM customer_client")),
        respond: (_url, init) => {
          expect(init?.headers?.["login-customer-id"]).toBe("999");
          return {
            body: {
              results: [
                {
                  customerClient: {
                    id: "111",
                    descriptiveName: "Cliente A",
                    manager: false,
                    level: "1",
                    status: "ENABLED",
                  },
                },
              ],
            },
          };
        },
      },
    ]);

    const identities = await discoverGoogleAdsIdentities(http, "token", DEV_TOKEN);
    expect(identities).toEqual([
      { identityType: "manager", externalId: "999", label: "Lots MCC" },
      {
        identityType: "customer",
        externalId: "111",
        label: "Cliente A",
        parentLabel: "Lots MCC",
        parentExternalId: "999",
      },
    ]);
  });

  it("traduz HTML 404 de versão descontinuada", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("customers:listAccessibleCustomers"),
        respond: () => ({ status: 404, body: HTML_404 }),
      },
    ]);

    await expect(discoverGoogleAdsIdentities(http, "token", DEV_TOKEN)).rejects.toThrow(
      /versão REST em uso é v23/,
    );
  });

  it("explica token de desenvolvedor em modo teste", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("customers:listAccessibleCustomers"),
        respond: () => ({
          status: 403,
          body: {
            error: {
              message: "The caller does not have permission",
              details: [
                {
                  errors: [
                    {
                      errorCode: { authorizationError: "DEVELOPER_TOKEN_NOT_APPROVED" },
                      message: "Developer token is not approved for use with this account",
                    },
                  ],
                },
              ],
            },
          },
        }),
      },
    ]);

    await expect(discoverGoogleAdsIdentities(http, "token", DEV_TOKEN)).rejects.toThrow(
      /modo teste/,
    );
  });
});

describe("withGoogleAdsManagerParents", () => {
  it("anexa a MCC quando o customer filho é selecionado", () => {
    const discovered = [
      { identityType: "manager", externalId: "999", label: "MCC" },
      {
        identityType: "customer",
        externalId: "111",
        label: "Cliente A",
        parentExternalId: "999",
        parentLabel: "MCC",
      },
    ];
    const attached = withGoogleAdsManagerParents(discovered, new Set(["111"]));
    expect(attached.map((item) => item.externalId)).toEqual(["111", "999"]);
  });
});
