import type { CredentialKey } from "../../../../../../contracts/credential/credential-vault.v1";

export const META_OAUTH_DEFAULT_SCOPES = [
  "ads_read",
  "business_management",
  "pages_read_engagement",
  "instagram_basic",
] as const;

export const META_LEADS_RETRIEVAL_SCOPE = "leads_retrieval";
export const META_PAGES_MANAGE_ADS_SCOPE = "pages_manage_ads";
export const META_PAGES_MANAGE_METADATA_SCOPE = "pages_manage_metadata";

/**
 * Formulário instantâneo: opt-in após o caso de uso no app —
 * META_REQUEST_LEADS_SCOPE=1. Sem o flag o dialog de anúncios não pede
 * essas permissões (um escopo inválido derruba o login inteiro).
 */
export function metaAdsOauthScopes(): readonly string[] {
  const scopes: string[] = [...META_OAUTH_DEFAULT_SCOPES];
  if (process.env.META_REQUEST_LEADS_SCOPE?.trim() === "1") {
    scopes.push(
      META_LEADS_RETRIEVAL_SCOPE,
      META_PAGES_MANAGE_ADS_SCOPE,
      META_PAGES_MANAGE_METADATA_SCOPE,
    );
  }
  return scopes;
}

export interface MetaOAuthConfigV1 {
  clientId: string;
  clientSecret: string;
  graphVersion?: string;
  credentialKey?: CredentialKey;
  defaultScopes?: readonly string[];
}

export function metaOAuthDialogUrl(graphVersion: string): string {
  return `https://www.facebook.com/${graphVersion}/dialog/oauth`;
}

export function metaGraphOAuthUrl(graphVersion: string): string {
  return `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
}
