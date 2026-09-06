/** Escopos que o app Meta já usa com sucesso (métricas / páginas). */
export const INSTAGRAM_ORGANIC_METRICS_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_read_engagement",
  "pages_show_list",
  "pages_manage_posts",
  "business_management",
] as const;

/**
 * Publicação no feed. Só pode ir no dialog OAuth depois que a permissão
 * existir em App Dashboard → Casos de uso / Permissions and Features.
 * Sem isso a Meta mostra "Invalid Scopes" para desenvolvedores.
 */
export const INSTAGRAM_ORGANIC_PUBLISH_SCOPE = "instagram_content_publish";

export function instagramOrganicOauthScopes(): readonly string[] {
  if (process.env.META_REQUEST_IG_PUBLISH_SCOPE?.trim() === "1") {
    return [...INSTAGRAM_ORGANIC_METRICS_SCOPES, INSTAGRAM_ORGANIC_PUBLISH_SCOPE];
  }
  return INSTAGRAM_ORGANIC_METRICS_SCOPES;
}

/** Alias estável para testes e manifests — métricas, sem o escopo de publish. */
export const INSTAGRAM_ORGANIC_OAUTH_SCOPES = INSTAGRAM_ORGANIC_METRICS_SCOPES;
