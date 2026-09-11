-- =========================================================
-- 56_portfolio_overview_single_pass.sql
--
-- Timeout em /admin e /admin/relatorios.
--
-- A view LIVE de vw_overview_cliente (não versionada nas migrations 02/08)
-- faz 8 UNION ALL, cada um relendo vw_metricas_normalizadas → vw_metricas
-- prefer_hub MATERIALIZED (Hub+Make inteiros, sem pushdown de data) + RLS.
-- 8 varreduras no JWT autenticado estouram o statement_timeout do API.
--
-- Correção:
-- 1) vw_metricas sem MATERIALIZED (filtro de data pode descer).
-- 2) vw_overview_cliente em UM GROUP BY FILTER (como a 08).
-- 3) RPC portfolio_overview(from,to) — uma passagem, data no WHERE.
-- 4) RPC portfolio_clientes_ativos() — Hub∪Make uma vez, sem 8 unions.
-- =========================================================

CREATE OR REPLACE VIEW public.vw_metricas
WITH (security_invoker = true) AS
WITH hub AS (
  SELECT
    h.id,
    h.data,
    h.cliente,
    h.plataforma,
    h.metrica,
    h.valor,
    h.campanha,
    h.created_at,
    COALESCE(al.nome_canonico, h.cliente) AS cliente_canonico
  FROM public.base_metricas_hub h
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = h.cliente
  WHERE h.valor IS NOT NULL
    AND NOT (
      lower(h.plataforma) = 'meta ads'
      AND lower(h.metrica) IN ('results', 'conversions')
      AND btrim(COALESCE(h.campanha, '')) = ''
      AND COALESCE(h.valor, 0) = 0
    )
),
hub_days AS (
  SELECT DISTINCT cliente_canonico, lower(plataforma) AS plat, data
  FROM hub
)
SELECT id, data, cliente, plataforma, metrica, valor, campanha, created_at FROM hub
UNION ALL
SELECT
  m.id,
  m.data,
  m.cliente,
  m.plataforma,
  m.metrica,
  m.valor,
  m.campanha,
  m.created_at
FROM public.base_metricas_make m
LEFT JOIN public.cliente_aliases al ON al.alias_metricas = m.cliente
WHERE m.valor IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hub_days hd
    WHERE hd.cliente_canonico = COALESCE(al.nome_canonico, m.cliente)
      AND hd.plat = lower(m.plataforma)
      AND hd.data = m.data
  );

GRANT SELECT ON public.vw_metricas TO authenticated;
GRANT SELECT ON public.vw_metricas TO service_role;

CREATE OR REPLACE VIEW public.vw_overview_cliente
WITH (security_invoker = true) AS
SELECT
  data,
  cliente,
  SUM(valor) FILTER (WHERE plataforma = 'meta_ads' AND metrica = 'spend') AS meta_spend,
  SUM(valor) FILTER (WHERE plataforma = 'google_ads' AND metrica = 'spend') AS google_spend,
  SUM(valor) FILTER (WHERE plataforma IN ('meta_ads', 'google_ads') AND metrica = 'impressions') AS total_impressions,
  SUM(valor) FILTER (WHERE plataforma IN ('meta_ads', 'google_ads') AND metrica = 'clicks') AS total_clicks,
  SUM(valor) FILTER (WHERE plataforma = 'ga4' AND metrica = 'sessions') AS ga4_sessions,
  SUM(valor) FILTER (WHERE plataforma = 'ga4' AND metrica = 'conversions') AS ga4_conversions,
  SUM(valor) FILTER (WHERE plataforma = 'instagram' AND metrica = 'reach') AS instagram_reach,
  SUM(valor) FILTER (WHERE plataforma = 'instagram' AND metrica = 'total_interactions') AS instagram_interactions
FROM public.vw_metricas_normalizadas
GROUP BY data, cliente;

GRANT SELECT ON public.vw_overview_cliente TO authenticated;

CREATE OR REPLACE VIEW public.vw_clientes_ativos
WITH (security_invoker = true) AS
SELECT
  cliente,
  MAX(data) AS ultima_data_recebida,
  MAX(created_at) AS ultima_ingestao,
  array_agg(DISTINCT plataforma ORDER BY plataforma) AS plataformas_ativas,
  COUNT(*) AS total_registros
FROM public.vw_metricas_normalizadas
GROUP BY cliente;

GRANT SELECT ON public.vw_clientes_ativos TO authenticated;

CREATE INDEX IF NOT EXISTS idx_base_metricas_hub_data ON public.base_metricas_hub (data);
CREATE INDEX IF NOT EXISTS idx_base_metricas_make_data ON public.base_metricas_make (data);

CREATE OR REPLACE FUNCTION public.portfolio_overview(p_from date, p_to date)
RETURNS TABLE (
  data date,
  cliente text,
  meta_spend double precision,
  google_spend double precision,
  total_impressions double precision,
  total_clicks double precision,
  ga4_sessions double precision,
  ga4_conversions double precision,
  instagram_reach double precision,
  instagram_interactions double precision
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH allowed AS (
    SELECT c.cliente_nome FROM public.current_user_clientes() AS c
  ),
  hub AS (
    SELECT
      h.data,
      COALESCE(al.nome_canonico, h.cliente) AS cliente,
      lower(h.plataforma) AS plat_raw,
      lower(h.metrica) AS metrica,
      CASE
        WHEN lower(h.plataforma) = 'google ads' AND lower(h.metrica) = 'spend'
          THEN h.valor / 1000000.0
        ELSE h.valor
      END AS valor
    FROM public.base_metricas_hub h
    LEFT JOIN public.cliente_aliases al ON al.alias_metricas = h.cliente
    WHERE h.valor IS NOT NULL
      AND h.data >= p_from
      AND h.data <= p_to
      AND COALESCE(al.nome_canonico, h.cliente) IN (SELECT allowed.cliente_nome FROM allowed)
      AND NOT (
        lower(h.plataforma) = 'meta ads'
        AND lower(h.metrica) IN ('results', 'conversions')
        AND btrim(COALESCE(h.campanha, '')) = ''
        AND COALESCE(h.valor, 0) = 0
      )
  ),
  hub_days AS (
    SELECT DISTINCT hub.cliente, hub.plat_raw, hub.data FROM hub
  ),
  make AS (
    SELECT
      m.data,
      COALESCE(al.nome_canonico, m.cliente) AS cliente,
      lower(m.plataforma) AS plat_raw,
      lower(m.metrica) AS metrica,
      CASE
        WHEN lower(m.plataforma) = 'google ads' AND lower(m.metrica) = 'spend'
          THEN m.valor / 1000000.0
        ELSE m.valor
      END AS valor
    FROM public.base_metricas_make m
    LEFT JOIN public.cliente_aliases al ON al.alias_metricas = m.cliente
    WHERE m.valor IS NOT NULL
      AND m.data >= p_from
      AND m.data <= p_to
      AND COALESCE(al.nome_canonico, m.cliente) IN (SELECT allowed.cliente_nome FROM allowed)
      AND NOT EXISTS (
        SELECT 1 FROM hub_days hd
        WHERE hd.cliente = COALESCE(al.nome_canonico, m.cliente)
          AND hd.plat_raw = lower(m.plataforma)
          AND hd.data = m.data
      )
  ),
  n AS (
    SELECT
      s.data,
      s.cliente,
      CASE s.plat_raw
        WHEN 'meta ads' THEN 'meta_ads'
        WHEN 'google ads' THEN 'google_ads'
        WHEN 'google analytics 4' THEN 'ga4'
        WHEN 'ga4' THEN 'ga4'
        WHEN 'instagram' THEN 'instagram'
        ELSE replace(s.plat_raw, ' ', '_')
      END AS plataforma,
      s.metrica,
      s.valor
    FROM (SELECT * FROM hub UNION ALL SELECT * FROM make) s
  )
  SELECT
    n.data,
    n.cliente,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'meta_ads' AND n.metrica = 'spend')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'google_ads' AND n.metrica = 'spend')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma IN ('meta_ads', 'google_ads') AND n.metrica = 'impressions')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma IN ('meta_ads', 'google_ads') AND n.metrica = 'clicks')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'ga4' AND n.metrica = 'sessions')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'ga4' AND n.metrica = 'conversions')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'instagram' AND n.metrica = 'reach')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'instagram' AND n.metrica = 'total_interactions')::double precision
  FROM n
  GROUP BY n.data, n.cliente;
END;
$$;

CREATE OR REPLACE FUNCTION public.portfolio_clientes_ativos()
RETURNS TABLE (
  cliente text,
  ultima_data_recebida date,
  ultima_ingestao timestamptz,
  plataformas_ativas text[],
  total_registros bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH allowed AS (
    SELECT c.cliente_nome FROM public.current_user_clientes() AS c
  ),
  src AS (
    SELECT
      COALESCE(al.nome_canonico, x.cliente) AS cliente_nome,
      x.data,
      x.created_at,
      CASE lower(x.plataforma)
        WHEN 'meta ads' THEN 'meta_ads'
        WHEN 'google ads' THEN 'google_ads'
        WHEN 'google analytics 4' THEN 'ga4'
        WHEN 'ga4' THEN 'ga4'
        WHEN 'instagram' THEN 'instagram'
        WHEN 'google business' THEN 'google_business'
        ELSE replace(lower(x.plataforma), ' ', '_')
      END AS plataforma
    FROM (
      SELECT h.cliente, h.data, h.created_at, h.plataforma FROM public.base_metricas_hub h
      UNION ALL
      SELECT m.cliente, m.data, m.created_at, m.plataforma FROM public.base_metricas_make m
    ) x
    LEFT JOIN public.cliente_aliases al ON al.alias_metricas = x.cliente
    WHERE COALESCE(al.nome_canonico, x.cliente) IN (SELECT allowed.cliente_nome FROM allowed)
  )
  SELECT
    src.cliente_nome,
    MAX(src.data),
    MAX(src.created_at),
    array_agg(DISTINCT src.plataforma ORDER BY src.plataforma),
    COUNT(*)::bigint
  FROM src
  GROUP BY src.cliente_nome;
END;
$$;

REVOKE ALL ON FUNCTION public.portfolio_overview(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portfolio_overview(date, date) TO authenticated;
REVOKE ALL ON FUNCTION public.portfolio_clientes_ativos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portfolio_clientes_ativos() TO authenticated;
