-- =========================================================
-- 57_overview_paid_conversions.sql
--
-- Visão geral / Relatórios: KPI Conversões lia só ga4_conversions.
-- GA4 no Make para em 2026-08-17 → últimos 30d = 0.
-- Hub Meta já grava results (objetivo da campanha) e conversions (pixel).
-- Colunas novas só no fim da view/RPC.
-- KPI consolidado = meta_results + google_conversions + ga4_conversions
-- (não soma pixel Meta em cima de results — seria dobro).
-- =========================================================

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
  SUM(valor) FILTER (WHERE plataforma = 'instagram' AND metrica = 'total_interactions') AS instagram_interactions,
  SUM(valor) FILTER (WHERE plataforma = 'meta_ads' AND metrica = 'results') AS meta_results,
  SUM(valor) FILTER (WHERE plataforma = 'meta_ads' AND metrica = 'conversions') AS meta_conversions,
  SUM(valor) FILTER (WHERE plataforma = 'google_ads' AND metrica = 'conversions') AS google_conversions
FROM public.vw_metricas_normalizadas
GROUP BY data, cliente;

GRANT SELECT ON public.vw_overview_cliente TO authenticated;

DROP FUNCTION IF EXISTS public.portfolio_overview(date, date);

CREATE FUNCTION public.portfolio_overview(p_from date, p_to date)
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
  instagram_interactions double precision,
  meta_results double precision,
  meta_conversions double precision,
  google_conversions double precision
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
    SUM(n.valor) FILTER (WHERE n.plataforma = 'instagram' AND n.metrica = 'total_interactions')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'meta_ads' AND n.metrica = 'results')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'meta_ads' AND n.metrica = 'conversions')::double precision,
    SUM(n.valor) FILTER (WHERE n.plataforma = 'google_ads' AND n.metrica = 'conversions')::double precision
  FROM n
  GROUP BY n.data, n.cliente;
END;
$$;

REVOKE ALL ON FUNCTION public.portfolio_overview(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portfolio_overview(date, date) TO authenticated;
