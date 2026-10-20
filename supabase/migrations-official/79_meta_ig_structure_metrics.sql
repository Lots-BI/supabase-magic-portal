-- =========================================================
-- 79_meta_ig_structure_metrics.sql
-- (aditivo · views finais, colunas novas no FIM)
--
-- Meta: seguidores/visitas de anúncio, vídeo, compras.
-- Instagram: unfollow e snapshot de seguidores.
-- Linhas de hierarquia (campanha nx + tab) ficam fora da view de campanha
-- para não duplicar gasto. O dashboard de estrutura lê o RPC direto.
-- =========================================================

CREATE OR REPLACE VIEW public.vw_meta_ads_normalizada_prefer_hub
WITH (security_invoker = true) AS
WITH hub AS (
  SELECT
    bh.data,
    COALESCE(al.nome_canonico, bh.cliente) AS cliente,
    bh.campanha,
    lower(bh.metrica) AS metrica,
    bh.valor
  FROM public.base_metricas_hub bh
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bh.cliente
  WHERE lower(bh.plataforma) = 'meta ads'
    AND bh.valor IS NOT NULL
    AND COALESCE(bh.campanha, '') NOT LIKE 'nx' || chr(9) || '%'
    AND COALESCE(al.nome_canonico, bh.cliente) IN (
      SELECT cliente_nome FROM public.current_user_clientes()
    )
    AND NOT (
      lower(bh.metrica) IN ('results', 'conversions')
      AND btrim(COALESCE(bh.campanha, '')) = ''
      AND COALESCE(bh.valor, 0) = 0
    )
),
hub_days AS (
  SELECT DISTINCT data, cliente FROM hub
),
make AS (
  SELECT
    bm.data,
    COALESCE(al.nome_canonico, bm.cliente) AS cliente,
    bm.campanha,
    lower(bm.metrica) AS metrica,
    bm.valor
  FROM public.base_metricas_make bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE lower(bm.plataforma) = 'meta ads'
    AND bm.valor IS NOT NULL
    AND COALESCE(al.nome_canonico, bm.cliente) IN (
      SELECT cliente_nome FROM public.current_user_clientes()
    )
    AND NOT EXISTS (
      SELECT 1 FROM hub_days hd
      WHERE hd.data = bm.data
        AND hd.cliente = COALESCE(al.nome_canonico, bm.cliente)
    )
)
SELECT * FROM hub
UNION ALL
SELECT * FROM make;

GRANT SELECT ON public.vw_meta_ads_normalizada_prefer_hub TO authenticated;

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
  SUM(valor) FILTER (WHERE metrica = 'page_engagements')   AS page_engagements,
  SUM(valor) FILTER (WHERE metrica = 'instagram_profile_follows') AS instagram_profile_follows,
  SUM(valor) FILTER (WHERE metrica = 'instagram_profile_visits') AS instagram_profile_visits,
  SUM(valor) FILTER (WHERE metrica = 'outbound_clicks') AS outbound_clicks,
  SUM(valor) FILTER (WHERE metrica = 'video_thruplay') AS video_thruplay,
  SUM(valor) FILTER (WHERE metrica = 'video_p25') AS video_p25,
  SUM(valor) FILTER (WHERE metrica = 'video_p50') AS video_p50,
  SUM(valor) FILTER (WHERE metrica = 'video_p75') AS video_p75,
  SUM(valor) FILTER (WHERE metrica = 'video_p100') AS video_p100,
  SUM(valor) FILTER (WHERE metrica = 'purchase_value') AS purchase_value
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
  SUM(valor) FILTER (WHERE metrica = 'follows')            AS follows,
  SUM(valor) FILTER (WHERE metrica = 'unfollows')          AS unfollows,
  SUM(valor) FILTER (WHERE metrica = 'followers_count')    AS followers_count,
  SUM(valor) FILTER (WHERE metrica = 'following_count')    AS following_count,
  SUM(valor) FILTER (WHERE metrica = 'media_count')        AS media_count
FROM public.vw_instagram_normalizada_prefer_hub
GROUP BY data, cliente;

GRANT SELECT ON public.vw_instagram_diario TO authenticated;
