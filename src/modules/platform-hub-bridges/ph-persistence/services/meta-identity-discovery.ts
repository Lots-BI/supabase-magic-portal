import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";

export interface MetaDiscoveredIdentityV1 {
  identityType: "business" | "ad_account" | "page" | "instagram";
  externalId: string;
  label: string;
  parentLabel?: string;
}

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

/** Descobre identidades Meta via Graph API — bridge admin, sem alterar Provider Framework. */
export async function discoverMetaIdentities(
  http: HttpClientPort,
  accessToken: string,
): Promise<MetaDiscoveredIdentityV1[]> {
  const results: MetaDiscoveredIdentityV1[] = [];

  try {
    const businesses = await graphGet<GraphListResponse<{ id: string; name: string }>>(
      http,
      "me/businesses",
      accessToken,
      { fields: "id,name", limit: "50" },
    );
    for (const b of businesses.data ?? []) {
      results.push({
        identityType: "business",
        externalId: b.id,
        label: b.name || b.id,
      });
    }
  } catch {
    // token sem business_management ou sem Business portfolios
  }

  try {
    const adAccounts = await graphGet<
      GraphListResponse<{ id: string; name: string; account_id?: string }>
    >(http, "me/adaccounts", accessToken, {
      fields: "id,name,account_id",
      limit: "100",
    });
    for (const a of adAccounts.data ?? []) {
      results.push({
        identityType: "ad_account",
        externalId: a.account_id ? `act_${a.account_id.replace(/^act_/, "")}` : a.id,
        label: a.name || a.id,
      });
    }
  } catch {
    // token sem permissões de Ads (ex.: instagram_organic)
  }

  const pages = await graphGet<GraphListResponse<{ id: string; name: string }>>(
    http,
    "me/accounts",
    accessToken,
    { fields: "id,name", limit: "100" },
  );
  for (const p of pages.data ?? []) {
    results.push({
      identityType: "page",
      externalId: p.id,
      label: p.name || p.id,
    });

    try {
      const ig = await graphGet<{
        instagram_business_account?: { id: string; username?: string };
      }>(http, p.id, accessToken, {
        fields: "instagram_business_account{id,username}",
      });
      const account = ig.instagram_business_account;
      if (account?.id) {
        results.push({
          identityType: "instagram",
          externalId: account.id,
          label: account.username ? `@${account.username}` : account.id,
          parentLabel: p.name,
        });
      }
    } catch {
      // página sem Instagram vinculado
    }
  }

  return results;
}
