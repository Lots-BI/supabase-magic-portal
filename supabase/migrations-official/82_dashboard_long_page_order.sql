-- =========================================================
-- 82_dashboard_long_page_order.sql
--
-- A API do PostgREST devolve no máximo 1000 linhas. Depois da coleta de
-- conjunto/anúncio o recorte do Rodrigo passou de 2,8 mil e o dashboard
-- lia só o primeiro milhar — dias e campanhas sumiam.
--
-- Esta função deixa a hierarquia (campanha nx + tab) de fora e ordena
-- da data mais nova para a mais antiga, para a página caber no limite
-- enquanto o client pagina o restante.
-- dashboard_meta_structure_long devolve só a hierarquia, também ordenada.
-- =========================================================

CREATE OR REPLACE FUNCTION public.dashboard_prefer_hub_long(
  p_plataforma text,
  p_cliente text,
  p_from date,
  p_to date
)
RETURNS TABLE (
  data date,
  cliente text,
  campanha text,
  metrica text,
  valor double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plat text := lower(btrim(COALESCE(p_plataforma, '')));
BEGIN
  IF p_cliente IS NULL OR btrim(p_cliente) = '' OR p_from IS NULL OR p_to IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.current_user_clientes() AS c
    WHERE c.cliente_nome = p_cliente
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH plat_keys AS (
    SELECT unnest(
      CASE plat
        WHEN 'ga4' THEN ARRAY['google analytics 4', 'ga4']
        WHEN 'google analytics 4' THEN ARRAY['google analytics 4', 'ga4']
        WHEN 'meta_ads' THEN ARRAY['meta ads']
        WHEN 'meta ads' THEN ARRAY['meta ads']
        WHEN 'google_ads' THEN ARRAY['google ads']
        WHEN 'google ads' THEN ARRAY['google ads']
        WHEN 'instagram' THEN ARRAY['instagram']
        WHEN 'google_business' THEN ARRAY['google business']
        WHEN 'google business' THEN ARRAY['google business']
        ELSE ARRAY[replace(plat, '_', ' ')]
      END
    ) AS key
  ),
  client_keys AS (
    SELECT p_cliente AS nome
    UNION
    SELECT al.alias_metricas
    FROM public.cliente_aliases al
    WHERE al.nome_canonico = p_cliente
  ),
  hub AS (
    SELECT
      bh.data,
      p_cliente::text AS cliente_nome,
      COALESCE(bh.campanha, '') AS campanha,
      lower(bh.metrica) AS metrica,
      CASE
        WHEN plat IN ('google_ads', 'google ads') AND lower(bh.metrica) = 'spend'
          THEN bh.valor / 1000000.0
        ELSE bh.valor
      END AS valor
    FROM public.base_metricas_hub bh
    WHERE bh.data >= p_from
      AND bh.data <= p_to
      AND bh.valor IS NOT NULL
      AND bh.cliente IN (SELECT client_keys.nome FROM client_keys)
      AND lower(bh.plataforma) IN (SELECT plat_keys.key FROM plat_keys)
      AND NOT (
        plat IN ('meta_ads', 'meta ads')
        AND COALESCE(bh.campanha, '') LIKE 'nx' || chr(9) || '%'
      )
      AND NOT (
        plat IN ('meta_ads', 'meta ads')
        AND lower(bh.metrica) IN ('results', 'conversions')
        AND btrim(COALESCE(bh.campanha, '')) = ''
        AND COALESCE(bh.valor, 0) = 0
      )
      AND NOT (
        plat IN ('google_ads', 'google ads')
        AND btrim(COALESCE(bh.campanha, '')) = ''
        AND COALESCE(bh.valor, 0) = 0
      )
  ),
  hub_days AS (
    SELECT DISTINCT hub.data FROM hub
  ),
  make AS (
    SELECT
      bm.data,
      p_cliente::text AS cliente_nome,
      COALESCE(bm.campanha, '') AS campanha,
      lower(bm.metrica) AS metrica,
      CASE
        WHEN plat IN ('google_ads', 'google ads') AND lower(bm.metrica) = 'spend'
          THEN bm.valor / 1000000.0
        ELSE bm.valor
      END AS valor
    FROM public.base_metricas_make bm
    WHERE bm.data >= p_from
      AND bm.data <= p_to
      AND bm.valor IS NOT NULL
      AND bm.cliente IN (SELECT client_keys.nome FROM client_keys)
      AND lower(bm.plataforma) IN (SELECT plat_keys.key FROM plat_keys)
      AND NOT EXISTS (
        SELECT 1 FROM hub_days hd WHERE hd.data = bm.data
      )
  )
  SELECT
    s.data,
    s.cliente_nome,
    s.campanha,
    s.metrica,
    CASE
      WHEN s.metrica = 'reviews_rating' THEN AVG(s.valor)
      ELSE SUM(s.valor)
    END::double precision
  FROM (SELECT * FROM hub UNION ALL SELECT * FROM make) s
  GROUP BY s.data, s.cliente_nome, s.campanha, s.metrica
  ORDER BY s.data DESC, s.campanha, s.metrica;
END;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_meta_structure_long(
  p_cliente text,
  p_from date,
  p_to date
)
RETURNS TABLE (
  data date,
  cliente text,
  campanha text,
  metrica text,
  valor double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_cliente IS NULL OR btrim(p_cliente) = '' OR p_from IS NULL OR p_to IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.current_user_clientes() AS c
    WHERE c.cliente_nome = p_cliente
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bh.data,
    p_cliente::text,
    COALESCE(bh.campanha, ''),
    lower(bh.metrica),
    SUM(bh.valor)::double precision
  FROM public.base_metricas_hub bh
  WHERE bh.data >= p_from
    AND bh.data <= p_to
    AND bh.valor IS NOT NULL
    AND lower(bh.plataforma) = 'meta ads'
    AND bh.cliente IN (
      SELECT p_cliente
      UNION
      SELECT al.alias_metricas
      FROM public.cliente_aliases al
      WHERE al.nome_canonico = p_cliente
    )
    AND COALESCE(bh.campanha, '') LIKE 'nx' || chr(9) || '%'
  GROUP BY bh.data, COALESCE(bh.campanha, ''), lower(bh.metrica)
  ORDER BY bh.data DESC, COALESCE(bh.campanha, ''), lower(bh.metrica);
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dashboard_meta_structure_long(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_meta_structure_long(text, date, date) TO authenticated, service_role;
