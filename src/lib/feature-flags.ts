/**
 * Feature flags de produto — ligar/desligar superfícies sem apagar código.
 *
 * Plano Estratégico: módulo completo permanece em `src/` e rotas;
 * nav e busca ocultos até reativação no roadmap.
 *
 * Central (Agency OS): rotas `/admin/central` permanecem; nav e busca
 * ocultos até reativação.
 */
export const FEATURE_PLANO_ESTRATEGICO_NAV = false;
export const FEATURE_ADMIN_CENTRAL_NAV = false;
/** Publicação Instagram via Graph a partir de Conteúdos (fail-soft sem scope). */
export const FEATURE_META_CONTENT_PUBLISH = true;
