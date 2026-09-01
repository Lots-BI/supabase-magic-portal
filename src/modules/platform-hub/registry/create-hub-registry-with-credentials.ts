import type { CredentialVaultPortV1 } from "../../../../contracts/credential/credential-vault.v1";
import { createMetaAdsRegistration } from "../plugins/meta_ads/create-meta-ads-registration";
import { createGoogleAdsRegistration } from "../plugins/google_ads/create-google-ads-registration";
import { createGa4Registration } from "../plugins/ga4/create-ga4-registration";
import { createGoogleBusinessRegistration } from "../plugins/google_business/create-google-business-registration";
import { createTikTokRegistration } from "../plugins/tiktok/create-tiktok-registration";
import { createYouTubeRegistration } from "../plugins/youtube/create-youtube-registration";
import { createInstagramOrganicRegistration } from "../plugins/instagram_organic/create-instagram-organic-registration";
import { GlobPluginLoader } from "./glob-plugin-loader";
import { HubRegistry } from "./hub-registry";

/** Registry com adapters que recebem CredentialVault — official_api real para homologação. */
export function createHubRegistryWithCredentials(
  credentialVault: CredentialVaultPortV1,
  options?: { httpClient?: import("../plugins/_internal/http/http-client.port").HttpClientPort },
): HubRegistry {
  const loader = new GlobPluginLoader();
  const registry = new HubRegistry();
  const httpOpts = options?.httpClient ? { httpClient: options.httpClient } : {};

  for (const registration of loader.load()) {
    const key = registration.manifest.key;

    if (key === "meta_ads") {
      registry.register(createMetaAdsRegistration(credentialVault, httpOpts));
    } else if (key === "google_ads") {
      registry.register(createGoogleAdsRegistration(credentialVault, httpOpts));
    } else if (key === "ga4") {
      registry.register(createGa4Registration(credentialVault, httpOpts));
    } else if (key === "google_business") {
      registry.register(createGoogleBusinessRegistration(credentialVault, httpOpts));
    } else if (key === "tiktok") {
      registry.register(createTikTokRegistration(credentialVault, httpOpts));
    } else if (key === "youtube") {
      registry.register(createYouTubeRegistration(credentialVault, httpOpts));
    } else if (key === "instagram_organic") {
      registry.register(createInstagramOrganicRegistration(credentialVault, httpOpts));
    } else {
      registry.register(registration);
    }
  }

  return registry;
}
