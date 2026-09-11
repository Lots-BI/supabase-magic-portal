-- =========================================================
-- 55_overview_query_timeout.sql
--
-- A 54 restaurou dados, mas /admin e /admin/relatorios tomavam
-- "canceling statement due to statement timeout".
--
-- Causa: current_user_clientes() em LANGUAGE sql era inlined no
-- IN (...) de vw_metricas_normalizadas. O corpo varria make+hub
-- outra vez, em cima do prefer_hub que já lê as mesmas tabelas,
-- com RLS por linha → plano quadrático.
--
-- Correção: catálogo só cadastro + client_access; plpgsql (não inline);
-- RLS com (SELECT has_role(...)) avaliado uma vez; CTE MATERIALIZED.
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_user_clientes()
RETURNS TABLE (cliente_nome text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ca.cliente_nome
  FROM public.client_access ca
  WHERE ca.user_id = auth.uid()
  UNION
  SELECT cc.nome_cliente
  FROM public.cadastro_clientes cc
  WHERE public.has_role(auth.uid(), 'admin')
    AND cc.ativo IS DISTINCT FROM false;
END;
$$;

DROP POLICY IF EXISTS base_metricas_make_select_authenticated ON public.base_metricas_make;
CREATE POLICY base_metricas_make_select_authenticated
  ON public.base_metricas_make
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'admin'))
    OR EXISTS (
      SELECT 1
      FROM public.client_access ca
      LEFT JOIN public.cliente_aliases al
        ON al.alias_metricas = base_metricas_make.cliente
      WHERE ca.user_id = auth.uid()
        AND ca.cliente_nome IS NOT DISTINCT FROM COALESCE(al.nome_canonico, base_metricas_make.cliente)
    )
  );

DROP POLICY IF EXISTS base_metricas_hub_admin_select ON public.base_metricas_hub;
CREATE POLICY base_metricas_hub_admin_select
  ON public.base_metricas_hub
  FOR SELECT
  TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS base_metricas_hub_client_select ON public.base_metricas_hub;
CREATE POLICY base_metricas_hub_client_select
  ON public.base_metricas_hub
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_access ca
      LEFT JOIN public.cliente_aliases al
        ON al.alias_metricas = base_metricas_hub.cliente
      WHERE ca.user_id = auth.uid()
        AND ca.cliente_nome IS NOT DISTINCT FROM COALESCE(al.nome_canonico, base_metricas_hub.cliente)
    )
  );

CREATE INDEX IF NOT EXISTS idx_base_metricas_make_cliente_plataforma_data
  ON public.base_metricas_make (cliente, plataforma, data);

CREATE OR REPLACE VIEW public.vw_metricas
WITH (security_invoker = true) AS
WITH hub AS MATERIALIZED (
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
hub_days AS MATERIALIZED (
  SELECT DISTINCT cliente_canonico, lower(plataforma) AS plat, data
  FROM hub
),
make AS MATERIALIZED (
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
  LEFT JOIN hub_days hd
    ON hd.cliente_canonico = COALESCE(al.nome_canonico, m.cliente)
   AND hd.plat = lower(m.plataforma)
   AND hd.data = m.data
  WHERE m.valor IS NOT NULL
    AND hd.data IS NULL
)
SELECT id, data, cliente, plataforma, metrica, valor, campanha, created_at FROM hub
UNION ALL
SELECT id, data, cliente, plataforma, metrica, valor, campanha, created_at FROM make;

GRANT SELECT ON public.vw_metricas TO authenticated;
GRANT SELECT ON public.vw_metricas TO service_role;
