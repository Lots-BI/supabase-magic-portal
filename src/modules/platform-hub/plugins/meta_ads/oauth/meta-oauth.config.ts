export const META_OAUTH_DEFAULT_SCOPES = [
  "ads_read",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
] as const;

export interface MetaOAuthConfigV1 {
  clientId: string;
  clientSecret: string;
  graphVersion?: string;
}

export function metaOAuthDialogUrl(graphVersion: string): string {
  return `https://www.facebook.com/${graphVersion}/dialog/oauth`;
}

export function metaGraphOAuthUrl(graphVersion: string): string {
  return `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
}
