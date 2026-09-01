import type { CredentialKey } from "../../../../../../contracts/credential/credential-vault.v1";

export const META_OAUTH_DEFAULT_SCOPES = [
  "ads_read",
  "business_management",
  "pages_read_engagement",
  "instagram_basic",
] as const;

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
