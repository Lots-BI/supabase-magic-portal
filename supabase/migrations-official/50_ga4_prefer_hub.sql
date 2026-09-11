-- =========================================================
-- 50_ga4_prefer_hub.sql
-- Dashboard GA4 prefere Hub por data+cliente (sem campanha).
-- Métricas iguais ao Make: activeusers, sessions, engagedsessions,
-- screenpageviews, eventcount, conversions. Label Hub pode ser GA4
-- (normalizer) ou Google Analytics 4.
-- =========================================================

CREATE OR REPLACE VIEW public.vw_ga4_normalizada_prefer_hub
WITH (security_invoker = true) AS
WITH hub AS (
  SELECT
    bh.data,
    COALESCE(al.nome_canonico, bh.cliente) AS cliente,
    lower(bh.metrica) AS metrica,
    bh.valor
  FROM public.base_metricas_hub bh
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bh.cliente
  WHERE lower(bh.plataforma) IN ('google analytics 4', 'ga4')
    AND bh.valor IS NOT NULL
    AND COALESCE(al.nome_canonico, bh.cliente) IN (
      SELECT cliente_nome FROM public.current_user_clientes()
    )
),
hub_days AS (
  SELECT DISTINCT data, cliente FROM hub
),
make AS (
  SELECT
    bm.data,
    COALESCE(al.nome_canonico, bm.cliente) AS cliente,
    lower(bm.metrica) AS metrica,
    bm.valor
  FROM public.base_metricas_make bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE lower(bm.plataforma) IN ('google analytics 4', 'ga4')
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

GRANT SELECT ON public.vw_ga4_normalizada_prefer_hub TO authenticated;

CREATE OR REPLACE VIEW public.vw_ga4_diario
WITH (security_invoker = true) AS
SELECT
  data, cliente,
  SUM(valor) FILTER (WHERE metrica = 'activeusers')     AS active_users,
  SUM(valor) FILTER (WHERE metrica = 'sessions')        AS sessions,
  SUM(valor) FILTER (WHERE metrica = 'engagedsessions') AS engaged_sessions,
  SUM(valor) FILTER (WHERE metrica = 'screenpageviews') AS pageviews,
  SUM(valor) FILTER (WHERE metrica = 'eventcount')      AS event_count,
  SUM(valor) FILTER (WHERE metrica = 'conversions')     AS conversions,
  CASE
    WHEN SUM(valor) FILTER (WHERE metrica = 'sessions') > 0
    THEN SUM(valor) FILTER (WHERE metrica = 'engagedsessions')
       / SUM(valor) FILTER (WHERE metrica = 'sessions') * 100
  END AS engagement_rate
FROM public.vw_ga4_normalizada_prefer_hub
GROUP BY data, cliente;

GRANT SELECT ON public.vw_ga4_diario TO authenticated;
