-- =========================================================
-- 41_conteudos_material_upload.sql
-- Material do cliente: arquivos grandes/originais + RLS de insert
-- =========================================================

UPDATE storage.buckets
SET
  file_size_limit = 5368709120, -- 5 GB
  allowed_mime_types = NULL     -- validação fica no app (mime do browser varia)
WHERE id = 'editorial-media';

-- Cliente pode inserir anexo do próprio card (material)
DROP POLICY IF EXISTS content_card_attachments_client_insert ON public.content_card_attachments;
CREATE POLICY content_card_attachments_client_insert ON public.content_card_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    media_role = 'cliente_material'
    AND card_id IN (
      SELECT id FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );

-- Storage: cliente lê/escreve só em content-cards/{cardId}/...
DROP POLICY IF EXISTS editorial_media_content_cards_client ON storage.objects;
CREATE POLICY editorial_media_content_cards_client ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'editorial-media'
    AND (storage.foldername(name))[1] = 'content-cards'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  )
  WITH CHECK (
    bucket_id = 'editorial-media'
    AND (storage.foldername(name))[1] = 'content-cards'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );
