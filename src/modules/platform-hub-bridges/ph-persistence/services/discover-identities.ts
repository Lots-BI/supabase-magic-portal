import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import { discoverGa4Identities } from "./ga4-identity-discovery";
import { discoverGoogleAdsIdentities } from "./google-ads-identity-discovery";
import { discoverGoogleBusinessIdentities } from "./google-business-identity-discovery";
import { discoverInstagramOrganicIdentities } from "./instagram-organic-identity-discovery";
import { discoverMetaIdentities } from "./meta-identity-discovery";
import { discoverTikTokIdentities } from "./tiktok-identity-discovery";
import { discoverYouTubeIdentities } from "./youtube-identity-discovery";
import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

const OAUTH_PLUGINS = new Set([
  "meta_ads",
  "instagram_organic",
  "google_ads",
  "ga4",
  "google_business",
  "tiktok",
  "youtube",
]);

export function supportsIdentityDiscovery(pluginKey: string): boolean {
  return OAUTH_PLUGINS.has(pluginKey);
}

/** Roteia descoberta de identidades por plataforma — bridge admin. */
export async function discoverIdentitiesForPlugin(
  http: HttpClientPort,
  pluginKey: string,
  accessToken: string,
): Promise<DiscoveredIdentityV1[]> {
  let results: DiscoveredIdentityV1[];
  switch (pluginKey) {
    case "meta_ads":
      results = await discoverMetaIdentities(http, accessToken);
      break;
    case "instagram_organic":
      results = await discoverInstagramOrganicIdentities(http, accessToken);
      break;
    case "google_ads":
      results = await discoverGoogleAdsIdentities(http, accessToken);
      break;
    case "ga4":
      results = await discoverGa4Identities(http, accessToken);
      break;
    case "google_business":
      results = await discoverGoogleBusinessIdentities(http, accessToken);
      break;
    case "tiktok":
      results = await discoverTikTokIdentities(http, accessToken);
      break;
    case "youtube":
      results = await discoverYouTubeIdentities(http, accessToken);
      break;
    default:
      throw new Error(`Descoberta automática não disponível para ${pluginKey}`);
  }

  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.identityType}:${item.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
