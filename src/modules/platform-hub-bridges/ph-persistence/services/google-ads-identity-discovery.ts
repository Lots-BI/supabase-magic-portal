import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import { HttpClientError } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import {
  GOOGLE_ADS_REST_API_VERSION,
  googleAdsBaseUrl,
} from "@/modules/platform-hub/plugins/google_ads/api/google-ads-api-version";
import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

const MAX_IDENTITIES = 200;

interface ListAccessibleCustomersResponse {
  resourceNames?: string[];
  error?: { message: string };
}

interface GoogleAdsSearchResponse {
  results?: Array<{
    customer?: { id?: string; descriptiveName?: string; manager?: boolean };
    customerClient?: {
      id?: string;
      descriptiveName?: string;
      manager?: boolean;
      level?: string | number;
      status?: string;
    };
  }>;
  error?: { message: string };
}

function customerIdFromResource(resourceName: string): string {
  return resourceName.replace(/-/g, "").replace(/^customers\//, "");
}

function isHtmlBody(body: string | undefined): boolean {
  if (!body) return false;
  const head = body.trimStart().slice(0, 32).toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}

function parseGoogleAdsErrorMessage(body: string | undefined): string | undefined {
  if (!body || isHtmlBody(body)) return undefined;
  try {
    const parsed = JSON.parse(body) as {
      error?: {
        message?: string;
        details?: Array<{
          errors?: Array<{ message?: string; errorCode?: Record<string, string> }>;
        }>;
      };
    };
    const nested = parsed.error?.details?.[0]?.errors?.[0];
    const code = nested?.errorCode ? Object.values(nested.errorCode).join(" ") : "";
    const msg = nested?.message ?? parsed.error?.message;
    if (code && msg) return `${code}: ${msg}`;
    return msg;
  } catch {
    return undefined;
  }
}

function messageFromGoogleAdsHttpError(error: HttpClientError): string {
  if (isHtmlBody(error.body) && (error.status === 404 || error.status === 410)) {
    return `A API do Google Ads recusou o pedido (HTTP ${error.status}). A versão REST em uso é ${GOOGLE_ADS_REST_API_VERSION}.`;
  }
  const fromJson = parseGoogleAdsErrorMessage(error.body);
  if (fromJson) {
    if (/DEVELOPER_TOKEN_NOT_APPROVED|not approved|test accounts only/i.test(fromJson)) {
      return "O token de desenvolvedor do Google Ads está em modo teste e não lê contas reais. No API Center da MCC, peça acesso Basic — não gere outro token.";
    }
    return fromJson;
  }
  return `Google Ads HTTP ${error.status}`;
}

function googleAdsHeaders(
  accessToken: string,
  developerToken: string,
  loginCustomerId?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) {
    headers["login-customer-id"] = customerIdFromResource(loginCustomerId);
  }
  return headers;
}

async function searchGoogleAds(
  http: HttpClientPort,
  accessToken: string,
  developerToken: string,
  customerId: string,
  query: string,
  loginCustomerId?: string,
): Promise<GoogleAdsSearchResponse> {
  const response = await http.request(
    `${googleAdsBaseUrl()}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: googleAdsHeaders(accessToken, developerToken, loginCustomerId),
      body: JSON.stringify({ query }),
    },
  );
  return response.json<GoogleAdsSearchResponse>();
}

function pushIdentity(
  results: DiscoveredIdentityV1[],
  seen: Set<string>,
  identity: DiscoveredIdentityV1,
): void {
  if (seen.has(identity.externalId) || results.length >= MAX_IDENTITIES) return;
  seen.add(identity.externalId);
  results.push(identity);
}

/** Descobre contas Google Ads acessíveis ao token OAuth, incluindo clientes da MCC. */
export async function discoverGoogleAdsIdentities(
  http: HttpClientPort,
  accessToken: string,
  developerToken?: string,
): Promise<DiscoveredIdentityV1[]> {
  const devToken = developerToken?.trim() || process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!devToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN é obrigatório para descoberta Google Ads");
  }

  let listBody: ListAccessibleCustomersResponse;
  try {
    const listResponse = await http.request(
      `${googleAdsBaseUrl()}/customers:listAccessibleCustomers`,
      {
        headers: googleAdsHeaders(accessToken, devToken),
      },
    );
    listBody = await listResponse.json<ListAccessibleCustomersResponse>();
  } catch (error) {
    if (error instanceof HttpClientError) {
      throw new Error(messageFromGoogleAdsHttpError(error));
    }
    throw error;
  }
  if (listBody.error?.message) throw new Error(listBody.error.message);

  const results: DiscoveredIdentityV1[] = [];
  const seen = new Set<string>();
  const managers: DiscoveredIdentityV1[] = [];

  for (const resourceName of listBody.resourceNames ?? []) {
    const customerId = customerIdFromResource(resourceName);
    if (!customerId) continue;
    try {
      const detailBody = await searchGoogleAds(
        http,
        accessToken,
        devToken,
        customerId,
        `SELECT customer.id, customer.descriptive_name, customer.manager FROM customer WHERE customer.id = ${customerId}`,
      );
      const customer = detailBody.results?.[0]?.customer;
      const identity: DiscoveredIdentityV1 = {
        identityType: customer?.manager ? "manager" : "customer",
        externalId: customerId,
        label: customer?.descriptiveName ?? customerId,
      };
      pushIdentity(results, seen, identity);
      if (identity.identityType === "manager") managers.push(identity);
    } catch {
      pushIdentity(results, seen, {
        identityType: "customer",
        externalId: customerId,
        label: customerId,
      });
    }
  }

  for (const manager of managers) {
    try {
      const tree = await searchGoogleAds(
        http,
        accessToken,
        devToken,
        manager.externalId,
        "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.level, customer_client.status FROM customer_client WHERE customer_client.status = 'ENABLED'",
        manager.externalId,
      );
      for (const row of tree.results ?? []) {
        const client = row.customerClient;
        const childId = client?.id ? customerIdFromResource(String(client.id)) : "";
        const level = Number(client?.level ?? 0);
        if (!childId || level < 1) continue;
        pushIdentity(results, seen, {
          identityType: client?.manager ? "manager" : "customer",
          externalId: childId,
          label: client?.descriptiveName ?? childId,
          parentLabel: manager.label,
          parentExternalId: manager.externalId,
        });
      }
    } catch {
      // MCC sem hierarquia listável continua só com a própria conta.
    }
  }

  return results;
}
