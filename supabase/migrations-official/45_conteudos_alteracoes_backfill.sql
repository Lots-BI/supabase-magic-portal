-- =========================================================
-- 45_conteudos_alteracoes_backfill.sql  (aditivo, idempotente)
-- Cards com pedido de alteração ainda sem reenvio vão para as novas colunas.
-- Ignora "updated" posteriores (autosave do roteiro) — usa o pedido vs reenvio.
-- =========================================================

ALTER TABLE public.content_cards DISABLE TRIGGER content_cards_client_guard;

WITH last_change AS (
  SELECT DISTINCT ON (e.card_id)
    e.card_id,
    e.created_at
  FROM public.content_card_events e
  WHERE e.event_type = 'changes_requested'
  ORDER BY e.card_id, e.created_at DESC
),
last_resolve AS (
  SELECT e.card_id, max(e.created_at) AS created_at
  FROM public.content_card_events e
  WHERE e.event_type IN ('approval_requested', 'approved')
  GROUP BY e.card_id
)
UPDATE public.content_cards c
SET status = 'alteracoes_roteiro'::public.content_card_status,
    updated_at = now()
FROM last_change ch
LEFT JOIN last_resolve r ON r.card_id = ch.card_id
WHERE c.id = ch.card_id
  AND c.status = 'roteiro'
  AND (r.created_at IS NULL OR ch.created_at > r.created_at);

WITH last_change AS (
  SELECT DISTINCT ON (e.card_id)
    e.card_id,
    e.created_at
  FROM public.content_card_events e
  WHERE e.event_type = 'changes_requested'
  ORDER BY e.card_id, e.created_at DESC
),
last_resolve AS (
  SELECT e.card_id, max(e.created_at) AS created_at
  FROM public.content_card_events e
  WHERE e.event_type IN ('approval_requested', 'approved')
  GROUP BY e.card_id
)
UPDATE public.content_cards c
SET status = 'alteracoes_design'::public.content_card_status,
    updated_at = now()
FROM last_change ch
LEFT JOIN last_resolve r ON r.card_id = ch.card_id
WHERE c.id = ch.card_id
  AND c.status = 'producao'
  AND (r.created_at IS NULL OR ch.created_at > r.created_at);

ALTER TABLE public.content_cards ENABLE TRIGGER content_cards_client_guard;
