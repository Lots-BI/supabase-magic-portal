-- =========================================================
-- 48_base_metricas_hub_natural_key.sql
-- Unique natural key (já existia no remoto, agora versionada) + RPC
-- replace-by-day: apaga o dia do cliente+plataforma e reinsere o envelope.
-- Campanha que saiu do dia não fica fantasma; spend de ontem pode mudar.
-- GRANT só service_role. Nunca toca base_metricas_make.
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_base_metricas_hub_natural_key
  ON public.base_metricas_hub (cliente, plataforma, metrica, data, COALESCE(campanha, ''::text));

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

  DELETE FROM public.base_metricas_hub
  WHERE cliente = p_cliente
    AND lower(plataforma) = lower(p_plataforma)
    AND data = ANY (p_dates);

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
