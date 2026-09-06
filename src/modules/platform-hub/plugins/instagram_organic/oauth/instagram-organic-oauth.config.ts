/** Escopos de métricas, Páginas e Business Manager (agência). */
export const INSTAGRAM_ORGANIC_METRICS_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_read_engagement",
  "pages_show_list",
  "pages_manage_posts",
  "ads_read",
  "business_management",
] as const;

/**
 * Publicação no feed via Facebook Login + graph.facebook.com.
 * Diferente de instagram_business_content_publish (Instagram Login).
 */
export const INSTAGRAM_ORGANIC_PUBLISH_SCOPE = "instagram_content_publish";

/**
 * Pede publicação por padrão. Só omita se o App Dashboard ainda não tiver
 * o caso de uso (Invalid Scopes): META_REQUEST_IG_PUBLISH_SCOPE=0
 */
export function instagramOrganicOauthScopes(): readonly string[] {
  if (process.env.META_REQUEST_IG_PUBLISH_SCOPE?.trim() === "0") {
    return INSTAGRAM_ORGANIC_METRICS_SCOPES;
  }
  return [...INSTAGRAM_ORGANIC_METRICS_SCOPES, INSTAGRAM_ORGANIC_PUBLISH_SCOPE];
}

/** Alias estável — métricas + Página, sem o escopo de publish. */
export const INSTAGRAM_ORGANIC_OAUTH_SCOPES = INSTAGRAM_ORGANIC_METRICS_SCOPES;
