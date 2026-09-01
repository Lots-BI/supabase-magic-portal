import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { CredentialKey } from "../../../../contracts/credential/credential-vault.v1";
import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { CredentialAccessPort } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { Ga4OAuthService } from "@/modules/platform-hub/plugins/ga4/oauth/ga4-oauth.service";
import { GA4_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/ga4/ga4-credential-keys";
import { GoogleAdsOAuthService } from "@/modules/platform-hub/plugins/google_ads/oauth/google-ads-oauth.service";
import { GOOGLE_ADS_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/google_ads/google-ads-credential-keys";
import { GoogleBusinessOAuthService } from "@/modules/platform-hub/plugins/google_business/oauth/google-business-oauth.service";
import { GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/google_business/google-business-credential-keys";
import { INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/instagram_organic/instagram-credential-keys";
import { INSTAGRAM_ORGANIC_OAUTH_SCOPES } from "@/modules/platform-hub/plugins/instagram_organic/oauth/instagram-organic-oauth.config";
import { MetaOAuthService } from "@/modules/platform-hub/plugins/meta_ads/oauth/meta-oauth.service";
import { META_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/meta_ads/meta-credential-keys";
import { TikTokOAuthService } from "@/modules/platform-hub/plugins/tiktok/oauth/tiktok-oauth.service";
import { TIKTOK_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/tiktok/tiktok-credential-keys";
import { YouTubeOAuthService } from "@/modules/platform-hub/plugins/youtube/oauth/youtube-oauth.service";
import { YOUTUBE_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/youtube/youtube-credential-keys";

export type HubOAuthPluginKey =
  | "meta_ads"
  | "instagram_organic"
  | "google_ads"
  | "ga4"
  | "google_business"
  | "tiktok"
  | "youtube";

export interface HubOAuthHandle {
  pluginKey: HubOAuthPluginKey;
  credentialKey: CredentialKey;
  callbackPath: string;
  buildAuthorizationUrl(params: { redirectUri: string; state: string }): string;
  exchangeCodeForToken(params: {
    connectionId: ConnectionId;
    code: string;
    redirectUri: string;
  }): Promise<unknown>;
  validateAccessToken(accessToken: string): Promise<{
    valid: boolean;
    expiresAt?: string;
    scopes?: readonly string[];
    error?: string;
  }>;
  revokeConnectionToken(connectionId: ConnectionId): Promise<void>;
}

const GOOGLE_PLUGINS = new Set<HubOAuthPluginKey>([
  "google_ads",
  "ga4",
  "google_business",
  "youtube",
]);

function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET são obrigatórios");
  }
  return { clientId, clientSecret };
}

function metaOAuthConfig() {
  const clientId = process.env.META_APP_ID?.trim();
  const clientSecret = process.env.META_APP_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("META_APP_ID e META_APP_SECRET são obrigatórios para OAuth Meta");
  }
  return { clientId, clientSecret };
}

function tiktokOAuthConfig() {
  const appId = process.env.TIKTOK_APP_ID?.trim();
  const appSecret = process.env.TIKTOK_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error("TIKTOK_APP_ID e TIKTOK_APP_SECRET são obrigatórios para OAuth TikTok");
  }
  return { appId, appSecret };
}

export function isHubOAuthPlugin(pluginKey: string): pluginKey is HubOAuthPluginKey {
  return (
    pluginKey === "meta_ads" ||
    pluginKey === "instagram_organic" ||
    pluginKey === "google_ads" ||
    pluginKey === "ga4" ||
    pluginKey === "google_business" ||
    pluginKey === "tiktok" ||
    pluginKey === "youtube"
  );
}

export function oauthCredentialKeyForPlugin(pluginKey: string): CredentialKey | null {
  switch (pluginKey) {
    case "meta_ads":
      return META_OAUTH_CREDENTIAL_KEY;
    case "instagram_organic":
      return INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY;
    case "google_ads":
      return GOOGLE_ADS_OAUTH_CREDENTIAL_KEY;
    case "ga4":
      return GA4_OAUTH_CREDENTIAL_KEY;
    case "google_business":
      return GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY;
    case "tiktok":
      return TIKTOK_OAUTH_CREDENTIAL_KEY;
    case "youtube":
      return YOUTUBE_OAUTH_CREDENTIAL_KEY;
    default:
      return null;
  }
}

export function createHubOAuthHandle(
  pluginKey: HubOAuthPluginKey,
  httpClient: HttpClientPort,
  credentialAccess: CredentialAccessPort,
): HubOAuthHandle {
  switch (pluginKey) {
    case "meta_ads": {
      const oauth = new MetaOAuthService(metaOAuthConfig(), httpClient, credentialAccess);
      return {
        pluginKey,
        credentialKey: META_OAUTH_CREDENTIAL_KEY,
        callbackPath: "/oauth/meta/callback",
        buildAuthorizationUrl: (p) => oauth.buildAuthorizationUrl(p),
        exchangeCodeForToken: (p) => oauth.exchangeCodeForToken(p),
        validateAccessToken: (t) => oauth.validateAccessToken(t),
        revokeConnectionToken: (id) => oauth.revokeConnectionToken(id),
      };
    }
    case "instagram_organic": {
      const oauth = new MetaOAuthService(
        {
          ...metaOAuthConfig(),
          credentialKey: INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
          defaultScopes: INSTAGRAM_ORGANIC_OAUTH_SCOPES,
        },
        httpClient,
        credentialAccess,
      );
      return {
        pluginKey,
        credentialKey: INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
        callbackPath: "/oauth/meta/callback",
        buildAuthorizationUrl: (p) => oauth.buildAuthorizationUrl(p),
        exchangeCodeForToken: (p) => oauth.exchangeCodeForToken(p),
        validateAccessToken: (t) => oauth.validateAccessToken(t),
        revokeConnectionToken: (id) => oauth.revokeConnectionToken(id),
      };
    }
    case "google_ads": {
      const oauth = new GoogleAdsOAuthService(googleOAuthConfig(), httpClient, credentialAccess);
      return {
        pluginKey,
        credentialKey: GOOGLE_ADS_OAUTH_CREDENTIAL_KEY,
        callbackPath: "/oauth/google/callback",
        buildAuthorizationUrl: (p) => oauth.buildAuthorizationUrl(p),
        exchangeCodeForToken: (p) => oauth.exchangeCodeForToken(p),
        validateAccessToken: (t) => oauth.validateAccessToken(t),
        revokeConnectionToken: (id) => oauth.revokeConnectionToken(id),
      };
    }
    case "ga4": {
      const oauth = new Ga4OAuthService(googleOAuthConfig(), httpClient, credentialAccess);
      return {
        pluginKey,
        credentialKey: GA4_OAUTH_CREDENTIAL_KEY,
        callbackPath: "/oauth/google/callback",
        buildAuthorizationUrl: (p) => oauth.buildAuthorizationUrl(p),
        exchangeCodeForToken: (p) => oauth.exchangeCodeForToken(p),
        validateAccessToken: (t) => oauth.validateAccessToken(t),
        revokeConnectionToken: (id) => oauth.revokeConnectionToken(id),
      };
    }
    case "google_business": {
      const oauth = new GoogleBusinessOAuthService(
        googleOAuthConfig(),
        httpClient,
        credentialAccess,
      );
      return {
        pluginKey,
        credentialKey: GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY,
        callbackPath: "/oauth/google/callback",
        buildAuthorizationUrl: (p) => oauth.buildAuthorizationUrl(p),
        exchangeCodeForToken: (p) => oauth.exchangeCodeForToken(p),
        validateAccessToken: (t) => oauth.validateAccessToken(t),
        revokeConnectionToken: (id) => oauth.revokeConnectionToken(id),
      };
    }
    case "youtube": {
      const oauth = new YouTubeOAuthService(googleOAuthConfig(), httpClient, credentialAccess);
      return {
        pluginKey,
        credentialKey: YOUTUBE_OAUTH_CREDENTIAL_KEY,
        callbackPath: "/oauth/google/callback",
        buildAuthorizationUrl: (p) => oauth.buildAuthorizationUrl(p),
        exchangeCodeForToken: (p) => oauth.exchangeCodeForToken(p),
        validateAccessToken: (t) => oauth.validateAccessToken(t),
        revokeConnectionToken: (id) => oauth.revokeConnectionToken(id),
      };
    }
    case "tiktok": {
      const oauth = new TikTokOAuthService(tiktokOAuthConfig(), httpClient, credentialAccess);
      return {
        pluginKey,
        credentialKey: TIKTOK_OAUTH_CREDENTIAL_KEY,
        callbackPath: "/oauth/tiktok/callback",
        buildAuthorizationUrl: (p) => oauth.buildAuthorizationUrl(p),
        exchangeCodeForToken: (p) => oauth.exchangeCodeForToken(p),
        validateAccessToken: (t) => oauth.validateAccessToken(t),
        revokeConnectionToken: (id) => oauth.revokeConnectionToken(id),
      };
    }
  }
}

export function oauthCallbackKind(pluginKey: string): "meta" | "google" | "tiktok" | null {
  if (pluginKey === "meta_ads" || pluginKey === "instagram_organic") return "meta";
  if (GOOGLE_PLUGINS.has(pluginKey as HubOAuthPluginKey)) return "google";
  if (pluginKey === "tiktok") return "tiktok";
  return null;
}
