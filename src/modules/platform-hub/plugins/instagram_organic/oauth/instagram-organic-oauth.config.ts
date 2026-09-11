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

/** Comentários identificáveis (CRM). App Dashboard precisa do caso de uso antes do OAuth. */
export const INSTAGRAM_ORGANIC_COMMENTS_SCOPE = "instagram_manage_comments";
export const INSTAGRAM_ORGANIC_MESSAGES_SCOPE = "instagram_manage_messages";
export const PAGES_MESSAGING_SCOPE = "pages_messaging";

/**
 * Pede publicação por padrão. Só omita se o App Dashboard ainda não tiver
 * o caso de uso (Invalid Scopes): META_REQUEST_IG_PUBLISH_SCOPE=0
 *
 * Direct / mensagens: opt-in após App Review — META_REQUEST_IG_MESSAGES_SCOPE=1
 */
export function instagramOrganicOauthScopes(): readonly string[] {
  const scopes: string[] = [...INSTAGRAM_ORGANIC_METRICS_SCOPES];
  if (process.env.META_REQUEST_IG_PUBLISH_SCOPE?.trim() !== "0") {
    scopes.push(INSTAGRAM_ORGANIC_PUBLISH_SCOPE);
  }
  if (process.env.META_REQUEST_IG_COMMENTS_SCOPE?.trim() !== "0") {
    scopes.push(INSTAGRAM_ORGANIC_COMMENTS_SCOPE);
  }
  if (process.env.META_REQUEST_IG_MESSAGES_SCOPE?.trim() === "1") {
    scopes.push(INSTAGRAM_ORGANIC_MESSAGES_SCOPE, PAGES_MESSAGING_SCOPE);
  }
  return scopes;
}

/** Alias estável — métricas + Página, sem o escopo de publish. */
export const INSTAGRAM_ORGANIC_OAUTH_SCOPES = INSTAGRAM_ORGANIC_METRICS_SCOPES;
