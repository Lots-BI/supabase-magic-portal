-- =========================================================
-- 36_meta_ads_prefer_hub.sql (aditivo · só recria views)
--
-- Objetivo: fazer o dashboard Meta Ads (vw_meta_ads_diario) preferir dados
-- do Platform Hub (base_metricas_hub) por dia+cliente, com fallback para o
-- Make (base_metricas_make) nos dias que o Hub ainda não coletou.
--
-- Mesma receita da migration 34 (Instagram perfil), adaptada para incluir a
-- dimensão "campanha" (Meta Ads é por campanha/dia, Instagram é por conta/dia).
--
-- Diferente de ph_metricas_source (troca GLOBAL make↔hub usada por
-- vw_metricas/vw_metricas_normalizadas), aqui a preferência é POR LINHA
-- (data+cliente) e restrita à plataforma Meta Ads — nenhuma outra
-- plataforma é afetada, e ph_metricas_source.active_source NÃO é alterado.
--
-- Make continua escrevendo em base_metricas_make normalmente; pode ser
-- desligado manualmente depois de paridade validada (fora desta migration).
--
-- Nota: o coletor oficial (createOfficialMetaProvider) grava apenas
-- impressions/reach/clicks/spend — cpc/cpm/ctr/frequency (colunas herdadas
-- do pivot Make) ficam NULL em dias vindos do Hub. Sem impacto visível: o
-- dashboard (src/lib/platforms/meta-ads.ts) calcula esses KPIs no cliente a
-- partir de impressions/clicks/spend/reach, não lê essas colunas da view.
-- =========================================================

CREATE OR REPLACE VIEW public.vw_meta_ads_normalizada_prefer_hub AS
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

CREATE OR REPLACE VIEW public.vw_meta_ads_diario AS
SELECT
  data, cliente, campanha,
  SUM(valor) FILTER (WHERE metrica = 'reach')       AS reach,
  SUM(valor) FILTER (WHERE metrica = 'impressions') AS impressions,
  SUM(valor) FILTER (WHERE metrica = 'clicks')      AS clicks,
  AVG(valor) FILTER (WHERE metrica = 'cpc')         AS cpc,
  AVG(valor) FILTER (WHERE metrica = 'cpm')         AS cpm,
  AVG(valor) FILTER (WHERE metrica = 'ctr')         AS ctr,
  AVG(valor) FILTER (WHERE metrica = 'frequency')   AS frequency,
  SUM(valor) FILTER (WHERE metrica = 'spend')       AS spend
FROM public.vw_meta_ads_normalizada_prefer_hub
GROUP BY data, cliente, campanha;

GRANT SELECT ON public.vw_meta_ads_diario TO authenticated;

-- Nota: vw_overview_cliente (card "Visão geral") permanece lendo
-- vw_metricas_normalizadas (fonte global Make/Hub) — fora do escopo desta
-- entrega, que cobre apenas o dashboard Meta Ads (vw_meta_ads_diario).
