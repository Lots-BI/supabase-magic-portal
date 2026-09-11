-- =========================================================
-- 59_ig_media_link_content_cards.sql (aditivo, idempotente)
-- Liga publicações do Hub (`ig_media`) aos cards de Conteúdos
-- quando o Graph media id já está em `content_cards.external_post_id`.
-- Não cria coluna nova. Não sobrescreve FK já preenchida.
-- =========================================================

UPDATE public.ig_media m
SET
  content_card_id = c.id,
  updated_at = now()
FROM public.content_cards c
WHERE m.content_card_id IS NULL
  AND c.external_post_id IS NOT NULL
  AND c.external_post_id <> ''
  AND c.cadastro_cliente_id = m.cadastro_cliente_id
  AND m.ig_media_id = c.external_post_id;
