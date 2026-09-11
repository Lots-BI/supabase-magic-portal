-- =========================================================
-- 46_meta_instagram_extra_insight_metrics.sql
-- (aditivo · só recria views finais, colunas novas no FIM)
--
-- Meta Ads: cliques no link, cliques únicos, LPV, visualizações de vídeo
-- e engajamentos — o que o Gerenciador mostra além de clicks/impressions.
-- Instagram: views, replies, website_clicks, follows (insights de conta).
-- =========================================================

CREATE OR REPLACE VIEW public.vw_meta_ads_diario
WITH (security_invoker = true) AS
SELECT
  data, cliente, campanha,
  SUM(valor) FILTER (WHERE metrica = 'reach')              AS reach,
  SUM(valor) FILTER (WHERE metrica = 'impressions')        AS impressions,
  SUM(valor) FILTER (WHERE metrica = 'clicks')             AS clicks,
  AVG(valor) FILTER (WHERE metrica = 'cpc')                AS cpc,
  AVG(valor) FILTER (WHERE metrica = 'cpm')                AS cpm,
  AVG(valor) FILTER (WHERE metrica = 'ctr')                AS ctr,
  AVG(valor) FILTER (WHERE metrica = 'frequency')          AS frequency,
  SUM(valor) FILTER (WHERE metrica = 'spend')              AS spend,
  SUM(valor) FILTER (WHERE metrica = 'results')            AS results,
  SUM(valor) FILTER (WHERE metrica = 'conversions')        AS conversions,
  SUM(valor) FILTER (WHERE metrica = 'inline_link_clicks') AS inline_link_clicks,
  SUM(valor) FILTER (WHERE metrica = 'unique_clicks')      AS unique_clicks,
  SUM(valor) FILTER (WHERE metrica = 'link_clicks')        AS link_clicks,
  SUM(valor) FILTER (WHERE metrica = 'landing_page_views') AS landing_page_views,
  SUM(valor) FILTER (WHERE metrica = 'video_views')        AS video_views,
  SUM(valor) FILTER (WHERE metrica = 'post_engagements')   AS post_engagements
FROM public.vw_meta_ads_normalizada_prefer_hub
GROUP BY data, cliente, campanha;

GRANT SELECT ON public.vw_meta_ads_diario TO authenticated;

CREATE OR REPLACE VIEW public.vw_instagram_diario
WITH (security_invoker = true) AS
SELECT
  data, cliente,
  SUM(valor) FILTER (WHERE metrica = 'reach')              AS reach,
  SUM(valor) FILTER (WHERE metrica = 'total_interactions') AS interactions,
  SUM(valor) FILTER (WHERE metrica = 'accounts_engaged')   AS accounts_engaged,
  SUM(valor) FILTER (WHERE metrica = 'likes')              AS likes,
  SUM(valor) FILTER (WHERE metrica = 'comments')           AS comments,
  SUM(valor) FILTER (WHERE metrica = 'saves')              AS saves,
  SUM(valor) FILTER (WHERE metrica = 'shares')             AS shares,
  SUM(valor) FILTER (WHERE metrica = 'profile_links_taps') AS profile_links_taps,
  CASE
    WHEN SUM(valor) FILTER (WHERE metrica = 'reach') > 0
    THEN SUM(valor) FILTER (WHERE metrica = 'total_interactions')
       / SUM(valor) FILTER (WHERE metrica = 'reach') * 100
  END AS engagement_rate,
  SUM(valor) FILTER (WHERE metrica = 'views')              AS views,
  SUM(valor) FILTER (WHERE metrica = 'replies')            AS replies,
  SUM(valor) FILTER (WHERE metrica = 'website_clicks')     AS website_clicks,
  SUM(valor) FILTER (WHERE metrica = 'follows')            AS follows
FROM public.vw_instagram_normalizada_prefer_hub
GROUP BY data, cliente;

GRANT SELECT ON public.vw_instagram_diario TO authenticated;
