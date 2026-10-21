-- =========================================================
-- 90_hub_ad_account_id.sql
--
-- Um cliente pode ter várias contas de anúncios Meta na mesma
-- conexão (Fernanda: CA 1 + Lots _Fernandapsicóloga). A coleta
-- só puxava a identidade primary e o replace apagava o dia
-- inteiro. Sem ad_account_id na unique, duas contas com o mesmo
-- nome de campanha colidem.
--
-- Coluna no Hub, unique e replace por conta, RPC do dashboard
-- devolve o id, seletor na UI. Backfill das linhas Meta já
-- gravadas para a identidade primary. Não toca em fin_*.
-- =========================================================

ALTER TABLE public.base_metricas_hub
  ADD COLUMN IF NOT EXISTS ad_account_id text;

UPDATE public.base_metricas_hub AS h
SET ad_account_id = i.external_id
FROM public.ph_identities AS i
JOIN public.ph_connections AS c ON c.id = i.connection_id
JOIN public.cadastro_clientes AS cc ON cc.id = c.cadastro_id
WHERE h.ad_account_id IS NULL
  AND lower(h.plataforma) = 'meta ads'
  AND i.identity_type = 'ad_account'
  AND i.is_primary IS TRUE
  AND (
    h.cadastro_cliente_id = c.cadastro_id
    OR (
      h.cadastro_cliente_id IS NULL
      AND h.cliente IS NOT DISTINCT FROM cc.nome_cliente
    )
  );

CREATE INDEX IF NOT EXISTS idx_base_metricas_hub_ad_account
  ON public.base_metricas_hub (ad_account_id)
  WHERE ad_account_id IS NOT NULL;

DROP INDEX IF EXISTS uq_base_metricas_hub_cadastro_key;
DROP INDEX IF EXISTS uq_base_metricas_hub_legacy_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_base_metricas_hub_cadastro_key
  ON public.base_metricas_hub (
    cadastro_cliente_id,
    plataforma,
    metrica,
    data,
    COALESCE(campanha, ''::text),
    COALESCE(ad_account_id, ''::text)
  )
  WHERE cadastro_cliente_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_base_metricas_hub_legacy_name_key
  ON public.base_metricas_hub (
    cliente,
    plataforma,
    metrica,
    data,
    COALESCE(campanha, ''::text),
    COALESCE(ad_account_id, ''::text)
  )
  WHERE cadastro_cliente_id IS NULL;

ALTER TABLE public.ph_campaign_status
  ADD COLUMN IF NOT EXISTS ad_account_id text NOT NULL DEFAULT '';

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
  v_ad_account text;
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

  IF v_cadastro IS NULL THEN
    SELECT c.id
    INTO v_cadastro
    FROM public.cadastro_clientes AS c
    WHERE c.nome_cliente IS NOT DISTINCT FROM p_cliente
    ORDER BY c.id
    LIMIT 1;
  END IF;

  SELECT NULLIF(btrim(COALESCE(r->>'ad_account_id', '')), '')
  INTO v_ad_account
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r
  LIMIT 1;

  IF v_ad_account IS NULL AND lower(p_plataforma) = 'meta ads' THEN
    SELECT i.external_id
    INTO v_ad_account
    FROM public.ph_identities AS i
    JOIN public.ph_connections AS c ON c.id = i.connection_id
    WHERE i.identity_type = 'ad_account'
      AND i.is_primary IS TRUE
      AND (
        (v_cadastro IS NOT NULL AND c.cadastro_id = v_cadastro)
        OR (v_cadastro IS NULL AND c.cadastro_id IN (
          SELECT cc.id FROM public.cadastro_clientes AS cc
          WHERE cc.nome_cliente IS NOT DISTINCT FROM p_cliente
        ))
      )
    ORDER BY i.created_at
    LIMIT 1;
  END IF;

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
         AND NULLIF(r->>'cadastro_cliente_id', '') IS NOT NULL
       )
       OR (
         NULLIF(btrim(COALESCE(r->>'ad_account_id', '')), '') IS DISTINCT FROM v_ad_account
         AND NULLIF(btrim(COALESCE(r->>'ad_account_id', '')), '') IS NOT NULL
       )
  ) THEN
    RAISE EXCEPTION 'replace_hub_metric_days: row outside cliente/plataforma/dates';
  END IF;

  DELETE FROM public.base_metricas_hub AS h
  WHERE lower(h.plataforma) = lower(p_plataforma)
    AND h.data = ANY (p_dates)
    AND (
      (v_cadastro IS NOT NULL AND h.cadastro_cliente_id = v_cadastro)
      OR (h.cliente = p_cliente AND h.cadastro_cliente_id IS NULL)
      OR (v_cadastro IS NULL AND h.cliente = p_cliente)
    )
    AND (
      (v_ad_account IS NULL AND h.ad_account_id IS NULL)
      OR (v_ad_account IS NOT NULL AND h.ad_account_id IS NOT DISTINCT FROM v_ad_account)
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
    data, cliente, plataforma, metrica, valor, campanha, cadastro_cliente_id, ad_account_id
  )
  SELECT
    (r->>'data')::date,
    r->>'cliente',
    r->>'plataforma',
    r->>'metrica',
    NULLIF(r->>'valor', '')::double precision,
    NULLIF(r->>'campanha', ''),
    COALESCE(NULLIF(r->>'cadastro_cliente_id', '')::bigint, v_cadastro),
    COALESCE(NULLIF(btrim(COALESCE(r->>'ad_account_id', '')), ''), v_ad_account)
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) TO service_role;

DROP FUNCTION IF EXISTS public.dashboard_prefer_hub_long(text, text, date, date);
DROP FUNCTION IF EXISTS public.dashboard_meta_structure_long(text, date, date);

CREATE FUNCTION public.dashboard_prefer_hub_long(
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
  valor double precision,
  ad_account_id text
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
      END AS valor,
      NULLIF(btrim(COALESCE(bh.ad_account_id, '')), '') AS ad_account_id
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
      END AS valor,
      NULL::text AS ad_account_id
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
    END::double precision,
    s.ad_account_id
  FROM (SELECT * FROM hub UNION ALL SELECT * FROM make) s
  GROUP BY s.data, s.cliente_nome, s.campanha, s.metrica, s.ad_account_id
  ORDER BY s.data DESC, s.ad_account_id, s.campanha, s.metrica;
END;
$$;

CREATE FUNCTION public.dashboard_meta_structure_long(
  p_cliente text,
  p_from date,
  p_to date
)
RETURNS TABLE (
  data date,
  cliente text,
  campanha text,
  metrica text,
  valor double precision,
  ad_account_id text
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
    SUM(bh.valor)::double precision,
    NULLIF(btrim(COALESCE(bh.ad_account_id, '')), '')
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
  GROUP BY bh.data, COALESCE(bh.campanha, ''), lower(bh.metrica), NULLIF(btrim(COALESCE(bh.ad_account_id, '')), '')
  ORDER BY bh.data DESC, NULLIF(btrim(COALESCE(bh.ad_account_id, '')), ''), COALESCE(bh.campanha, ''), lower(bh.metrica);
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dashboard_meta_structure_long(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_meta_structure_long(text, date, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dashboard_meta_ad_accounts(p_cliente text)
RETURNS TABLE (
  ad_account_id text,
  label text,
  is_primary boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_cliente IS NULL OR btrim(p_cliente) = '' THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.current_user_clientes() AS c
    WHERE c.cliente_nome = p_cliente
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (i.external_id)
    i.external_id,
    i.label,
    i.is_primary
  FROM public.ph_identities AS i
  JOIN public.ph_connections AS c ON c.id = i.connection_id
  JOIN public.cadastro_clientes AS cc ON cc.id = c.cadastro_id
  WHERE i.identity_type = 'ad_account'
    AND c.plugin_key = 'meta_ads'
    AND cc.nome_cliente = p_cliente
    AND cc.id IN (SELECT public.current_user_cadastro_cliente_ids())
  ORDER BY i.external_id, i.is_primary DESC, i.label;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_meta_ad_accounts(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_meta_ad_accounts(text) TO authenticated, service_role;
