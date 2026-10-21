-- =========================================================
-- 88_metric_cadastro_id.sql
--
-- Métrica do Hub passa a carregar cadastro_clientes.id. Duas organizações
-- podem ter o mesmo nome de cliente sem misturar série. O texto `cliente`
-- continua preenchido para o Make da Lots. Slug único por organização.
-- Não toca em fin_*.
-- =========================================================

ALTER TABLE public.base_metricas_hub
  ADD COLUMN IF NOT EXISTS cadastro_cliente_id bigint;

UPDATE public.base_metricas_hub AS h
SET cadastro_cliente_id = c.id
FROM public.cadastro_clientes AS c
WHERE h.cadastro_cliente_id IS NULL
  AND c.nome_cliente IS NOT DISTINCT FROM h.cliente;

CREATE INDEX IF NOT EXISTS idx_base_metricas_hub_cadastro
  ON public.base_metricas_hub (cadastro_cliente_id);

DROP INDEX IF EXISTS uq_base_metricas_hub_natural_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_base_metricas_hub_cadastro_key
  ON public.base_metricas_hub (
    cadastro_cliente_id,
    plataforma,
    metrica,
    data,
    COALESCE(campanha, ''::text)
  )
  WHERE cadastro_cliente_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_base_metricas_hub_legacy_name_key
  ON public.base_metricas_hub (
    cliente,
    plataforma,
    metrica,
    data,
    COALESCE(campanha, ''::text)
  )
  WHERE cadastro_cliente_id IS NULL;

ALTER TABLE public.cadastro_clientes
  DROP CONSTRAINT IF EXISTS cadastro_clientes_slug_key;

DROP INDEX IF EXISTS cadastro_clientes_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS cadastro_clientes_organization_slug_key
  ON public.cadastro_clientes (organization_id, slug)
  WHERE organization_id IS NOT NULL AND slug IS NOT NULL AND btrim(slug) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS cadastro_clientes_slug_null_org_key
  ON public.cadastro_clientes (slug)
  WHERE organization_id IS NULL AND slug IS NOT NULL AND btrim(slug) <> '';

DROP POLICY IF EXISTS base_metricas_hub_select ON public.base_metricas_hub;
CREATE POLICY base_metricas_hub_select ON public.base_metricas_hub
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_owner(auth.uid()))
    OR (
      cadastro_cliente_id IS NOT NULL
      AND cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
    )
    OR (
      cadastro_cliente_id IS NULL
      AND public.metric_cliente_in_scope(cliente)
    )
  );

CREATE OR REPLACE FUNCTION public.replace_hub_metric_days(
  p_cliente text,
  p_plataforma text,
  p_dates date[],
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  v_cadastro bigint;
BEGIN
  IF p_cliente IS NULL OR btrim(p_cliente) = '' THEN
    RAISE EXCEPTION 'replace_hub_metric_days: cliente required';
  END IF;
  IF p_plataforma IS NULL OR btrim(p_plataforma) = '' THEN
    RAISE EXCEPTION 'replace_hub_metric_days: plataforma required';
  END IF;
  IF p_dates IS NULL OR cardinality(p_dates) = 0 THEN
    RETURN 0;
  END IF;

  SELECT NULLIF(r->>'cadastro_cliente_id', '')::bigint
  INTO v_cadastro
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r
  LIMIT 1;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r
    WHERE r->>'cliente' IS DISTINCT FROM p_cliente
       OR lower(r->>'plataforma') IS DISTINCT FROM lower(p_plataforma)
       OR (r->>'data')::date <> ALL (p_dates)
       OR r->>'metrica' IS NULL
       OR btrim(r->>'metrica') = ''
       OR r->>'data' IS NULL
       OR (
         v_cadastro IS NOT NULL
         AND NULLIF(r->>'cadastro_cliente_id', '')::bigint IS DISTINCT FROM v_cadastro
       )
  ) THEN
    RAISE EXCEPTION 'replace_hub_metric_days: row outside cliente/plataforma/dates';
  END IF;

  DELETE FROM public.base_metricas_hub AS h
  WHERE lower(h.plataforma) = lower(p_plataforma)
    AND h.data = ANY (p_dates)
    AND (
      CASE
        WHEN v_cadastro IS NOT NULL THEN h.cadastro_cliente_id = v_cadastro
        ELSE h.cliente = p_cliente AND h.cadastro_cliente_id IS NULL
      END
    )
    AND (
      COALESCE(h.campanha, '') NOT LIKE 'nx' || chr(9) || '%'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r
        WHERE (r->>'data')::date = h.data
          AND COALESCE(r->>'campanha', '') LIKE 'nx' || chr(9) || '%'
      )
    );

  INSERT INTO public.base_metricas_hub (
    data, cliente, plataforma, metrica, valor, campanha, cadastro_cliente_id
  )
  SELECT
    (r->>'data')::date,
    r->>'cliente',
    r->>'plataforma',
    r->>'metrica',
    NULLIF(r->>'valor', '')::double precision,
    NULLIF(r->>'campanha', ''),
    NULLIF(r->>'cadastro_cliente_id', '')::bigint
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) TO service_role;

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
        WHEN 'tiktok' THEN ARRAY['tiktok']
        WHEN 'youtube' THEN ARRAY['youtube']
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
  scoped_cadastro AS (
    SELECT cc.id
    FROM public.cadastro_clientes cc
    WHERE cc.nome_cliente = p_cliente
      AND cc.id IN (SELECT public.current_user_cadastro_cliente_ids())
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
      AND (
        (
          bh.cadastro_cliente_id IS NOT NULL
          AND bh.cadastro_cliente_id IN (SELECT scoped_cadastro.id FROM scoped_cadastro)
        )
        OR (
          bh.cadastro_cliente_id IS NULL
          AND bh.cliente IN (SELECT client_keys.nome FROM client_keys)
        )
      )
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
    AND (
      (
        bh.cadastro_cliente_id IS NOT NULL
        AND bh.cadastro_cliente_id IN (
          SELECT cc.id
          FROM public.cadastro_clientes cc
          WHERE cc.nome_cliente = p_cliente
            AND cc.id IN (SELECT public.current_user_cadastro_cliente_ids())
        )
      )
      OR (
        bh.cadastro_cliente_id IS NULL
        AND bh.cliente IN (
          SELECT p_cliente
          UNION
          SELECT al.alias_metricas
          FROM public.cliente_aliases al
          WHERE al.nome_canonico = p_cliente
        )
      )
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
