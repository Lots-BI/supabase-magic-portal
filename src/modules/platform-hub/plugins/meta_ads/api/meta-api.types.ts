export interface MetaGraphPagingV1 {
  cursors?: { before?: string; after?: string };
  next?: string;
}

export interface MetaActionValueV1 {
  action_type?: string;
  value?: string;
}

export interface MetaInsightRowV1 {
  campaign_name?: string;
  campaign_id?: string;
  date_start: string;
  date_stop: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  inline_link_clicks?: string;
  unique_clicks?: string;
  /** Todas as ações atribuídas (cliques, leads, compras, mensagens…). */
  actions?: MetaActionValueV1[];
  /** Subconjunto de conversões da Insights API (pixel / API / CRM). */
  conversions?: MetaActionValueV1[];
}

export interface MetaInsightsResponseV1 {
  data: MetaInsightRowV1[];
  paging?: MetaGraphPagingV1;
}

export interface MetaCampaignRowV1 {
  id: string;
  name?: string;
  objective?: string;
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
