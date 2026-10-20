-- =========================================================
-- 83_replace_hub_keep_structure.sql
--
-- replace_hub_metric_days apagava o dia inteiro. Uma coleta de campanha
-- sem conjunto/anúncio (falha ou página cortada) levava embora a estrutura
-- já gravada. Se o envelope do dia não traz linha nx, as linhas nx ficam.
-- Quando o envelope traz nx, o dia inteiro é trocado, como antes.
-- =========================================================

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

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r
    WHERE r->>'cliente' IS DISTINCT FROM p_cliente
       OR lower(r->>'plataforma') IS DISTINCT FROM lower(p_plataforma)
       OR (r->>'data')::date <> ALL (p_dates)
       OR r->>'metrica' IS NULL
       OR btrim(r->>'metrica') = ''
       OR r->>'data' IS NULL
  ) THEN
    RAISE EXCEPTION 'replace_hub_metric_days: row outside cliente/plataforma/dates';
  END IF;

  DELETE FROM public.base_metricas_hub AS h
  WHERE h.cliente = p_cliente
    AND lower(h.plataforma) = lower(p_plataforma)
    AND h.data = ANY (p_dates)
    AND (
      COALESCE(h.campanha, '') NOT LIKE 'nx' || chr(9) || '%'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r
        WHERE (r->>'data')::date = h.data
          AND COALESCE(r->>'campanha', '') LIKE 'nx' || chr(9) || '%'
      )
    );

  INSERT INTO public.base_metricas_hub (data, cliente, plataforma, metrica, valor, campanha)
  SELECT
    (r->>'data')::date,
    r->>'cliente',
    r->>'plataforma',
    r->>'metrica',
    NULLIF(r->>'valor', '')::double precision,
    NULLIF(r->>'campanha', '')
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_hub_metric_days(text, text, date[], jsonb) TO service_role;
