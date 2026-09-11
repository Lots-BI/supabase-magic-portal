-- =========================================================
-- 49_google_ads_prefer_hub.sql
-- Dashboard Google Ads prefere Hub por data+cliente+campanha.
-- Spend no storage = micros; a view ÷ 1e6 (igual Make / 02_views_metricas).
-- =========================================================

CREATE OR REPLACE VIEW public.vw_google_ads_normalizada_prefer_hub
WITH (security_invoker = true) AS
WITH hub AS (
  SELECT
    bh.data,
    COALESCE(al.nome_canonico, bh.cliente) AS cliente,
    bh.campanha,
    lower(bh.metrica) AS metrica,
    CASE
      WHEN lower(bh.metrica) = 'spend' THEN bh.valor / 1000000.0
      ELSE bh.valor
    END AS valor
  FROM public.base_metricas_hub bh
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bh.cliente
  WHERE lower(bh.plataforma) = 'google ads'
    AND bh.valor IS NOT NULL
    AND COALESCE(al.nome_canonico, bh.cliente) IN (
      SELECT cliente_nome FROM public.current_user_clientes()
    )
    AND NOT (
      btrim(COALESCE(bh.campanha, '')) = ''
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
    CASE
      WHEN lower(bm.metrica) = 'spend' THEN bm.valor / 1000000.0
      ELSE bm.valor
    END AS valor
  FROM public.base_metricas_make bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE lower(bm.plataforma) = 'google ads'
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

GRANT SELECT ON public.vw_google_ads_normalizada_prefer_hub TO authenticated;

CREATE OR REPLACE VIEW public.vw_google_ads_diario
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    data, cliente, campanha,
    SUM(valor) FILTER (WHERE metrica = 'impressions') AS impressions,
    SUM(valor) FILTER (WHERE metrica = 'clicks')      AS clicks,
    SUM(valor) FILTER (WHERE metrica = 'spend')       AS spend
  FROM public.vw_google_ads_normalizada_prefer_hub
  GROUP BY data, cliente, campanha
)
SELECT
  data, cliente, campanha,
  impressions, clicks, spend,
  CASE WHEN impressions > 0 THEN (clicks::numeric / impressions) * 100 END AS ctr,
  CASE WHEN clicks      > 0 THEN spend / clicks                          END AS cpc,
  CASE WHEN impressions > 0 THEN (spend / impressions) * 1000            END AS cpm
FROM base;

GRANT SELECT ON public.vw_google_ads_diario TO authenticated;
