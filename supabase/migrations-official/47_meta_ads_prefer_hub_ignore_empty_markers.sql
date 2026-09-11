-- =========================================================
-- 47_meta_ads_prefer_hub_ignore_empty_markers.sql
--
-- Marcadores de dia sem entrega (campanha vazia + results/conversions = 0)
-- existem só para o gap-finder não repetir o intervalo. Se entrarem na
-- prefer_hub, um dia só com marcador esconde o Make inteiro (Agência Lots
-- tem histórico Make que o Graph pode omitir).
-- =========================================================

CREATE OR REPLACE VIEW public.vw_meta_ads_normalizada_prefer_hub
WITH (security_invoker = true) AS
WITH hub AS (
  SELECT
    bh.data,
    COALESCE(al.nome_canonico, bh.cliente) AS cliente,
    bh.campanha,
    lower(bh.metrica) AS metrica,
    bh.valor
  FROM public.base_metricas_hub bh
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bh.cliente
  WHERE lower(bh.plataforma) = 'meta ads'
    AND bh.valor IS NOT NULL
    AND COALESCE(al.nome_canonico, bh.cliente) IN (
      SELECT cliente_nome FROM public.current_user_clientes()
    )
    AND NOT (
      lower(bh.metrica) IN ('results', 'conversions')
      AND btrim(COALESCE(bh.campanha, '')) = ''
      AND COALESCE(bh.valor, 0) = 0
    )
),
hub_days AS (
  SELECT DISTINCT data, cliente FROM hub
),
make AS (
  SELECT
    bm.data,
    COALESCE(al.nome_canonico, bm.cliente) AS cliente,
    bm.campanha,
    lower(bm.metrica) AS metrica,
    bm.valor
  FROM public.base_metricas_make bm
  LEFT JOIN public.cliente_aliases al ON al.alias_metricas = bm.cliente
  WHERE lower(bm.plataforma) = 'meta ads'
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

GRANT SELECT ON public.vw_meta_ads_normalizada_prefer_hub TO authenticated;
