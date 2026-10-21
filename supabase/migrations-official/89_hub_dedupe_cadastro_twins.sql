-- =========================================================
-- 89_hub_dedupe_cadastro_twins.sql
--
-- A 88 partiu o unique em duas metades (com cadastro_id / sem).
-- Uma coleta nova (com id) e outra antiga (sem id) no mesmo dia
-- gravavam a série duas vezes. O dashboard somava as duas:
-- José Bernardo 01–20/10 conversas 146 no Hub, 73 no Gerenciador.
--
-- Apaga a linha sem id quando a gêmea com id existe. Completa
-- cadastro_id nas que sobraram. O replace passa a apagar as duas
-- metades do dia e a carimbar o id pelo nome se o envelope não
-- trouxer. Não toca em fin_*.
-- =========================================================

DELETE FROM public.base_metricas_hub AS a
WHERE a.cadastro_cliente_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.base_metricas_hub AS b
    WHERE b.cadastro_cliente_id IS NOT NULL
      AND b.cliente IS NOT DISTINCT FROM a.cliente
      AND lower(b.plataforma) = lower(a.plataforma)
      AND lower(b.metrica) = lower(a.metrica)
      AND b.data = a.data
      AND COALESCE(b.campanha, '') = COALESCE(a.campanha, '')
  );

UPDATE public.base_metricas_hub AS h
SET cadastro_cliente_id = c.id
FROM public.cadastro_clientes AS c
WHERE h.cadastro_cliente_id IS NULL
  AND c.nome_cliente IS NOT DISTINCT FROM h.cliente;

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

  IF v_cadastro IS NULL THEN
    SELECT c.id
    INTO v_cadastro
    FROM public.cadastro_clientes AS c
    WHERE c.nome_cliente IS NOT DISTINCT FROM p_cliente
    ORDER BY c.id
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
    COALESCE(NULLIF(r->>'cadastro_cliente_id', '')::bigint, v_cadastro)
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) TO service_role;
