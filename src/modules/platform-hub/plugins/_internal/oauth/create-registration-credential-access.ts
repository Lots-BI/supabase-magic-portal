import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { HttpClientPort } from "../http/http-client.port";
import { FetchHttpClient } from "../http/fetch-http-client";
import { createCredentialAccess, type CredentialAccessPort } from "./credential-access.port";
import { createRefreshingCredentialAccess } from "./create-refreshing-credential-access";
import { Ga4OAuthService } from "../../ga4/oauth/ga4-oauth.service";
import { GA4_OAUTH_CREDENTIAL_KEY } from "../../ga4/ga4-credential-keys";
import { GoogleAdsOAuthService } from "../../google_ads/oauth/google-ads-oauth.service";
import { GOOGLE_ADS_OAUTH_CREDENTIAL_KEY } from "../../google_ads/google-ads-credential-keys";
import { GoogleBusinessOAuthService } from "../../google_business/oauth/google-business-oauth.service";
import { GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY } from "../../google_business/google-business-credential-keys";
import { MetaOAuthService } from "../../meta_ads/oauth/meta-oauth.service";
import { META_OAUTH_CREDENTIAL_KEY } from "../../meta_ads/meta-credential-keys";
import { TikTokOAuthService } from "../../tiktok/oauth/tiktok-oauth.service";
import { TIKTOK_OAUTH_CREDENTIAL_KEY } from "../../tiktok/tiktok-credential-keys";
import { YouTubeOAuthService } from "../../youtube/oauth/youtube-oauth.service";
import { YOUTUBE_OAUTH_CREDENTIAL_KEY } from "../../youtube/youtube-credential-keys";
import { INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY } from "../../instagram_organic/instagram-credential-keys";
import { INSTAGRAM_ORGANIC_OAUTH_SCOPES } from "../../instagram_organic/oauth/instagram-organic-oauth.config";

function googleOAuthEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function metaOAuthEnv() {
  const clientId = process.env.META_APP_ID?.trim();
  const clientSecret = process.env.META_APP_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function tiktokOAuthEnv() {
  const appId = process.env.TIKTOK_APP_ID?.trim();
  const appSecret = process.env.TIKTOK_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

/** Credential access com refresh automático — usado pelos Official Providers em homologação. */
export function createRegistrationCredentialAccess(
  vault: CredentialVaultPortV1,
  pluginKey: string,
  httpClient?: HttpClientPort,
): CredentialAccessPort {
  const http = httpClient ?? new FetchHttpClient();
  const base = createCredentialAccess(vault);

  switch (pluginKey) {
    case "meta_ads": {
      const env = metaOAuthEnv();
      if (!env) return base;
      const oauth = new MetaOAuthService(env, http, base);
      return createRefreshingCredentialAccess(vault, {
        credentialKey: META_OAUTH_CREDENTIAL_KEY,
        refreshAccessToken: (id) => oauth.refreshAccessToken(id),
      });
    }
    case "google_ads": {
      const env = googleOAuthEnv();
      if (!env) return base;
      const oauth = new GoogleAdsOAuthService(env, http, base);
      return createRefreshingCredentialAccess(vault, {
        credentialKey: GOOGLE_ADS_OAUTH_CREDENTIAL_KEY,
        refreshAccessToken: (id) => oauth.refreshAccessToken(id),
      });
    }
    case "ga4": {
      const env = googleOAuthEnv();
      if (!env) return base;
      const oauth = new Ga4OAuthService(env, http, base);
      return createRefreshingCredentialAccess(vault, {
        credentialKey: GA4_OAUTH_CREDENTIAL_KEY,
        refreshAccessToken: (id) => oauth.refreshAccessToken(id),
      });
    }
    case "google_business": {
      const env = googleOAuthEnv();
      if (!env) return base;
      const oauth = new GoogleBusinessOAuthService(env, http, base);
      return createRefreshingCredentialAccess(vault, {
        credentialKey: GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY,
        refreshAccessToken: (id) => oauth.refreshAccessToken(id),
      });
    }
    case "youtube": {
      const env = googleOAuthEnv();
      if (!env) return base;
      const oauth = new YouTubeOAuthService(env, http, base);
      return createRefreshingCredentialAccess(vault, {
        credentialKey: YOUTUBE_OAUTH_CREDENTIAL_KEY,
        refreshAccessToken: (id) => oauth.refreshAccessToken(id),
      });
    }
    case "tiktok": {
      const env = tiktokOAuthEnv();
      if (!env) return base;
      const oauth = new TikTokOAuthService(env, http, base);
      return createRefreshingCredentialAccess(vault, {
        credentialKey: TIKTOK_OAUTH_CREDENTIAL_KEY,
        refreshAccessToken: (id) => oauth.refreshAccessToken(id),
      });
    }
    case "instagram_organic": {
      const env = metaOAuthEnv();
      if (!env) return base;
      const oauth = new MetaOAuthService(
        {
          ...env,
          credentialKey: INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
          defaultScopes: INSTAGRAM_ORGANIC_OAUTH_SCOPES,
        },
        http,
        base,
      );
      return createRefreshingCredentialAccess(vault, {
        credentialKey: INSTAGRAM_ORGANIC_OAUTH_CREDENTIAL_KEY,
        refreshAccessToken: (id) => oauth.refreshAccessToken(id),
      });
    }
    default:
      return base;
  }
}
