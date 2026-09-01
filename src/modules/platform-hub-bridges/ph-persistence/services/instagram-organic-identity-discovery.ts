import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { MetaDiscoveredIdentityV1 } from "./meta-identity-discovery";

interface GraphListResponse<T> {
  data?: T[];
  error?: { message: string };
}

const GRAPH_VERSION = "v22.0";

async function graphGet<T>(
  http: HttpClientPort,
  path: string,
  accessToken: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  const response = await http.request(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    searchParams: { access_token: accessToken, ...searchParams },
  });
  const body = await response.json<T & { error?: { message: string } }>();
  if (body.error?.message) throw new Error(body.error.message);
  return body;
}

/** Descobre páginas Facebook + perfis Instagram Business — sem endpoints de Ads. */
export async function discoverInstagramOrganicIdentities(
  http: HttpClientPort,
  accessToken: string,
): Promise<MetaDiscoveredIdentityV1[]> {
  const results: MetaDiscoveredIdentityV1[] = [];

  const pages = await graphGet<
    GraphListResponse<{
      id: string;
      name: string;
      instagram_business_account?: { id: string; username?: string };
    }>
  >(http, "me/accounts", accessToken, {
    fields: "id,name,instagram_business_account{id,username}",
    limit: "100",
  });

  for (const page of pages.data ?? []) {
    results.push({
      identityType: "page",
      externalId: page.id,
      label: page.name || page.id,
    });

    const account = page.instagram_business_account;
    if (account?.id) {
      results.push({
        identityType: "instagram",
        externalId: account.id,
        label: account.username ? `@${account.username}` : account.id,
        parentLabel: page.name,
      });
    }
  }

  return results;
}
