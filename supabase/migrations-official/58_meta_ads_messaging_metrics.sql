-- =========================================================
-- 58_meta_ads_messaging_metrics.sql
-- (aditivo · só recria a view final, colunas novas no FIM)
--
-- Conversas WhatsApp/Messenger e engajamento com a Página — o Gerenciador
-- conta a mensagem como Resultados; a aba Meta Ads precisa das colunas.
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
  SUM(valor) FILTER (WHERE metrica = 'post_engagements')   AS post_engagements,
  SUM(valor) FILTER (WHERE metrica = 'messaging_conversations_started') AS messaging_conversations_started,
  SUM(valor) FILTER (WHERE metrica = 'messaging_first_replies') AS messaging_first_replies,
  SUM(valor) FILTER (WHERE metrica = 'page_engagements')   AS page_engagements
FROM public.vw_meta_ads_normalizada_prefer_hub
GROUP BY data, cliente, campanha;

GRANT SELECT ON public.vw_meta_ads_diario TO authenticated;
