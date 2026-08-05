/** Scopes para Connect / sync de métricas (piloto Hub). */
export const META_OAUTH_CONNECT_SCOPES = [
  "ads_read",
  "business_management",
  "pages_read_engagement",
  "instagram_basic",
] as const;

/**
 * Scopes extras para publish (Marco 4).
 * Só peça no dialog depois de habilitá-los no App Dashboard (Use Cases) —
 * senão o Facebook mostra "Invalid Scopes" e o login quebra.
 */
export const META_OAUTH_PUBLISH_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "instagram_content_publish",
] as const;

/** Default do dialog OAuth = connect (métricas). Não incluir publish aqui. */
export const META_OAUTH_DEFAULT_SCOPES = META_OAUTH_CONNECT_SCOPES;

export interface ResolveMetaOAuthDialogScopesOptions {
  /** Pedido explícito (UI “Reconectar com Publish”). */
  includePublish?: boolean;
}

/**
 * Resolve scopes do dialog Meta.
 * Publish só entra com `includePublish` ou `META_OAUTH_INCLUDE_PUBLISH_SCOPES=1`.
 */
export function resolveMetaOAuthDialogScopes(
  options: ResolveMetaOAuthDialogScopesOptions = {},
): readonly string[] {
  const envOn = process.env.META_OAUTH_INCLUDE_PUBLISH_SCOPES?.trim() === "1";
  if (!options.includePublish && !envOn) {
    return META_OAUTH_CONNECT_SCOPES;
  }
  return [...new Set([...META_OAUTH_CONNECT_SCOPES, ...META_OAUTH_PUBLISH_SCOPES])];
}

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
