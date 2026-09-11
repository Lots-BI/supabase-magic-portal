-- =========================================================
-- 54_overview_prefer_hub_and_make_rls.sql
--
-- Visão geral + Relatórios leem vw_overview_cliente →
-- vw_metricas_normalizadas → vw_metricas.
--
-- Dois buracos deixavam as abas vazias:
-- 1) base_metricas_make tinha RLS ligado e NENHUMA policy de SELECT.
--    Views com security_invoker=true (51) passam a respeitar isso:
--    JWT authenticated → 0 linhas. (Mesmo bug documentado na 07.)
-- 2) vw_metricas era make XOR hub (ph_metricas_source). Com source=make,
--    os dias Hub de Meta/Instagram não entram no consolidado.
--
-- Correção: policy de SELECT (admin + cliente do cadastro) e vw_metricas
-- no mesmo modelo prefer_hub dos dashboards (Hub ganha o dia; Make no resto).
-- Sentinela Meta (campanha vazia + results/conversions 0) NÃO esconde Make.
-- Nunca escreve make. ph_metricas_source deixa de ser o cutover global.
-- =========================================================

-- ---------- 1. RLS Make — autenticado precisa ler para as views invoker ----------
DROP POLICY IF EXISTS base_metricas_make_select_authenticated ON public.base_metricas_make;
CREATE POLICY base_metricas_make_select_authenticated
  ON public.base_metricas_make
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.client_access ca
      LEFT JOIN public.cliente_aliases al
        ON al.alias_metricas = base_metricas_make.cliente
      WHERE ca.user_id = auth.uid()
        AND ca.cliente_nome IS NOT DISTINCT FROM COALESCE(al.nome_canonico, base_metricas_make.cliente)
    )
  );

-- ---------- 2. RLS Hub — cliente do cadastro (admin já existia) ----------
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

GRANT SELECT ON public.base_metricas_make TO authenticated;
GRANT SELECT ON public.base_metricas_hub TO authenticated;

-- ---------- 3. Catálogo admin inclui cadastro + Hub (não só Make) ----------
CREATE OR REPLACE FUNCTION public.current_user_clientes()
RETURNS TABLE (cliente_nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.cliente_nome
  FROM public.client_access ca
  WHERE ca.user_id = auth.uid()
  UNION
  SELECT cc.nome_cliente
  FROM public.cadastro_clientes cc
  WHERE public.has_role(auth.uid(), 'admin')
    AND cc.ativo IS DISTINCT FROM false
  UNION
  SELECT DISTINCT COALESCE(al.nome_canonico, bm.cliente)
  FROM public.base_metricas_make bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE public.has_role(auth.uid(), 'admin')
  UNION
  SELECT DISTINCT COALESCE(al.nome_canonico, bh.cliente)
  FROM public.base_metricas_hub bh
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bh.cliente
  WHERE public.has_role(auth.uid(), 'admin');
$$;

-- ---------- 4. vw_metricas — prefer_hub por cliente + plataforma + data ----------
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
),
make AS (
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
    )
)
SELECT id, data, cliente, plataforma, metrica, valor, campanha, created_at FROM hub
UNION ALL
SELECT id, data, cliente, plataforma, metrica, valor, campanha, created_at FROM make;

GRANT SELECT ON public.vw_metricas TO authenticated;
GRANT SELECT ON public.vw_metricas TO service_role;
