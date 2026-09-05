-- =========================================================
-- 37_meta_ads_results_conversions.sql (aditivo · só recria view final)
--
-- Adiciona results e conversions em vw_meta_ads_diario. A view intermediária
-- vw_meta_ads_normalizada_prefer_hub já passa metrica/valor sem filtro —
-- não precisa ser recriada. Colunas novas no FIM (CREATE OR REPLACE VIEW
-- no Postgres só aceita append).
-- =========================================================

CREATE OR REPLACE VIEW public.vw_meta_ads_diario AS
SELECT
  data, cliente, campanha,
  SUM(valor) FILTER (WHERE metrica = 'reach')       AS reach,
  SUM(valor) FILTER (WHERE metrica = 'impressions') AS impressions,
  SUM(valor) FILTER (WHERE metrica = 'clicks')      AS clicks,
  AVG(valor) FILTER (WHERE metrica = 'cpc')         AS cpc,
  AVG(valor) FILTER (WHERE metrica = 'cpm')         AS cpm,
  AVG(valor) FILTER (WHERE metrica = 'ctr')         AS ctr,
  AVG(valor) FILTER (WHERE metrica = 'frequency')   AS frequency,
  SUM(valor) FILTER (WHERE metrica = 'spend')       AS spend,
  SUM(valor) FILTER (WHERE metrica = 'results')     AS results,
  SUM(valor) FILTER (WHERE metrica = 'conversions') AS conversions
FROM public.vw_meta_ads_normalizada_prefer_hub
GROUP BY data, cliente, campanha;

GRANT SELECT ON public.vw_meta_ads_diario TO authenticated;
