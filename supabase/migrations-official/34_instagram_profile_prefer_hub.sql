-- =========================================================
-- 34_instagram_profile_prefer_hub.sql (aditivo · só recria views)
--
-- Objetivo: fazer o dashboard /instagram (vw_instagram_diario) preferir
-- dados do Platform Hub (base_metricas_hub) por dia+cliente, com fallback
-- para o Make (base_metricas_make) nos dias que o Hub ainda não coletou.
--
-- Diferente de ph_metricas_source (troca GLOBAL make↔hub usada por
-- vw_metricas/vw_metricas_normalizadas), aqui a preferência é POR LINHA
-- (data+cliente) e restrita à plataforma Instagram — nenhuma outra
-- plataforma é afetada, e ph_metricas_source.active_source NÃO é alterado.
--
-- Make continua escrevendo em base_metricas_make normalmente; pode ser
-- desligado manualmente depois de paridade validada (fora desta migration).
-- =========================================================

CREATE OR REPLACE VIEW public.vw_instagram_normalizada_prefer_hub AS
WITH hub AS (
  SELECT
    bh.data,
    COALESCE(al.nome_canonico, bh.cliente) AS cliente,
    lower(bh.metrica) AS metrica,
    bh.valor
  FROM public.base_metricas_hub bh
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bh.cliente
  WHERE lower(bh.plataforma) = 'instagram'
    AND bh.valor IS NOT NULL
    AND COALESCE(al.nome_canonico, bh.cliente) IN (
      SELECT cliente_nome FROM public.current_user_clientes()
    )
),
hub_days AS (
  SELECT DISTINCT data, cliente FROM hub
),
make AS (
  SELECT
    bm.data,
    COALESCE(al.nome_canonico, bm.cliente) AS cliente,
    lower(bm.metrica) AS metrica,
    bm.valor
  FROM public.base_metricas_make bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE lower(bm.plataforma) = 'instagram'
    AND bm.valor IS NOT NULL
    AND COALESCE(al.nome_canonico, bm.cliente) IN (
      SELECT cliente_nome FROM public.current_user_clientes()
    )
    AND NOT EXISTS (
      SELECT 1 FROM hub_days hd
      WHERE hd.data = bm.data
        AND hd.cliente = COALESCE(al.nome_canonico, bm.cliente)
    )
)
SELECT * FROM hub
UNION ALL
SELECT * FROM make;

GRANT SELECT ON public.vw_instagram_normalizada_prefer_hub TO authenticated;

CREATE OR REPLACE VIEW public.vw_instagram_diario AS
SELECT
  data, cliente,
  SUM(valor) FILTER (WHERE metrica = 'reach')              AS reach,
  SUM(valor) FILTER (WHERE metrica = 'total_interactions') AS interactions,
  SUM(valor) FILTER (WHERE metrica = 'accounts_engaged')   AS accounts_engaged,
  SUM(valor) FILTER (WHERE metrica = 'likes')              AS likes,
  SUM(valor) FILTER (WHERE metrica = 'comments')           AS comments,
  SUM(valor) FILTER (WHERE metrica = 'saves')              AS saves,
  SUM(valor) FILTER (WHERE metrica = 'shares')              AS shares,
  SUM(valor) FILTER (WHERE metrica = 'profile_links_taps') AS profile_links_taps,
  CASE
    WHEN SUM(valor) FILTER (WHERE metrica = 'reach') > 0
    THEN SUM(valor) FILTER (WHERE metrica = 'total_interactions')
       / SUM(valor) FILTER (WHERE metrica = 'reach') * 100
  END AS engagement_rate
FROM public.vw_instagram_normalizada_prefer_hub
GROUP BY data, cliente;

GRANT SELECT ON public.vw_instagram_diario TO authenticated;

-- Nota: vw_overview_cliente (card "Visão geral") permanece lendo
-- vw_metricas_normalizadas (fonte global Make/Hub) — fora do escopo desta
-- entrega, que cobre apenas o dashboard /instagram (vw_instagram_diario).
