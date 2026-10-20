export interface MetaGraphPagingV1 {
  cursors?: { before?: string; after?: string };
  next?: string;
}

export interface MetaActionValueV1 {
  action_type?: string;
  value?: string;
}

/**
 * Item de `results` / `objective_results` na Insights API — a coluna
 * Resultados do Gerenciador. Formato varia (value plano ou values[]).
 */
export interface MetaResultStatV1 {
  indicator?: string;
  action_type?: string;
  value?: string;
  values?: Array<{ value?: string; attribution_windows?: string[] }>;
}

export interface MetaInsightRowV1 {
  campaign_name?: string;
  campaign_id?: string;
  date_start: string;
  date_stop: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  inline_link_clicks?: string;
  unique_clicks?: string;
  instagram_profile_follow?: string | MetaActionValueV1[];
  instagram_profile_visits?: string | MetaActionValueV1[];
  outbound_clicks?: MetaActionValueV1[];
  video_thruplay_watched_actions?: MetaActionValueV1[];
  video_p25_watched_actions?: MetaActionValueV1[];
  video_p50_watched_actions?: MetaActionValueV1[];
  video_p75_watched_actions?: MetaActionValueV1[];
  video_p100_watched_actions?: MetaActionValueV1[];
  action_values?: MetaActionValueV1[];
  /** Todas as ações atribuídas (cliques, leads, compras, mensagens…). */
  actions?: MetaActionValueV1[];
  /** Subconjunto de conversões da Insights API (pixel / API / CRM). */
  conversions?: MetaActionValueV1[];
  /**
   * Coluna Resultados do Gerenciador (outcome da campanha). Lista; não é o
   * mesmo que `conversions`.
   */
  results?: MetaResultStatV1[];
  /** Mesmo recorte, quando a versão da API expõe objective_results. */
  objective_results?: MetaResultStatV1[];
}

export interface MetaInsightsResponseV1 {
  data: MetaInsightRowV1[];
  paging?: MetaGraphPagingV1;
}

export interface MetaCampaignRowV1 {
  id: string;
  name?: string;
  objective?: string;
  effective_status?: string;
}

export interface MetaAdCreativeV1 {
  source_instagram_media_id?: string;
}

export interface MetaAdRowV1 {
  id?: string;
  creative?: MetaAdCreativeV1;
}

export interface MetaAdsListResponseV1 {
  data: MetaAdRowV1[];
  paging?: MetaGraphPagingV1;
}

export interface MetaCampaignsResponseV1 {
  data: MetaCampaignRowV1[];
  paging?: MetaGraphPagingV1;
}

export interface MetaOAuthTokenResponseV1 {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface MetaDebugTokenResponseV1 {
  data: {
    is_valid: boolean;
    expires_at?: number;
    scopes?: string[];
    error?: { message: string };
  };
}
