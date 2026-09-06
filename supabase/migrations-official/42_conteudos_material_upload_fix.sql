-- =========================================================
-- 42_conteudos_material_upload_fix.sql
-- - Cliente pode atualizar só o checklist (após anexar material)
-- - Storage path por split_part (upload resumível / arquivos grandes)
-- =========================================================

CREATE OR REPLACE FUNCTION public.tg_content_cards_client_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Checklist automático após upload de material (status permanece)
  IF NEW.checklist IS DISTINCT FROM OLD.checklist
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.cliente_nome IS NOT DISTINCT FROM OLD.cliente_nome
    AND NEW.cadastro_cliente_id IS NOT DISTINCT FROM OLD.cadastro_cliente_id
    AND NEW.plataforma IS NOT DISTINCT FROM OLD.plataforma
    AND NEW.formato IS NOT DISTINCT FROM OLD.formato
    AND NEW.titulo IS NOT DISTINCT FROM OLD.titulo
    AND NEW.legenda IS NOT DISTINCT FROM OLD.legenda
    AND NEW.copy_text IS NOT DISTINCT FROM OLD.copy_text
    AND NEW.roteiro IS NOT DISTINCT FROM OLD.roteiro
    AND NEW.direcao_arte IS NOT DISTINCT FROM OLD.direcao_arte
    AND NEW.cta IS NOT DISTINCT FROM OLD.cta
    AND NEW.capa_url IS NOT DISTINCT FROM OLD.capa_url
    AND NEW.data_publicacao IS NOT DISTINCT FROM OLD.data_publicacao
    AND NEW.hora_publicacao IS NOT DISTINCT FROM OLD.hora_publicacao
    AND NEW.localizacao IS NOT DISTINCT FROM OLD.localizacao
    AND NEW.tags IS NOT DISTINCT FROM OLD.tags
    AND NEW.observacoes IS NOT DISTINCT FROM OLD.observacoes
    AND NEW.responsavel_email IS NOT DISTINCT FROM OLD.responsavel_email
    AND NEW.responsavel_user_id IS NOT DISTINCT FROM OLD.responsavel_user_id
    AND NEW.pilar_id IS NOT DISTINCT FROM OLD.pilar_id
    AND NEW.estrategia_id IS NOT DISTINCT FROM OLD.estrategia_id
    AND NEW.kanban_ordem IS NOT DISTINCT FROM OLD.kanban_ordem
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.archived_at IS NOT DISTINCT FROM OLD.archived_at
    AND NEW.ai_metadata IS NOT DISTINCT FROM OLD.ai_metadata
    AND NEW.integration_metadata IS NOT DISTINCT FROM OLD.integration_metadata
    AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
    AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
  THEN
    RETURN NEW;
  END IF;

  IF NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome
    OR NEW.cadastro_cliente_id IS DISTINCT FROM OLD.cadastro_cliente_id
    OR NEW.plataforma IS DISTINCT FROM OLD.plataforma
    OR NEW.formato IS DISTINCT FROM OLD.formato
    OR NEW.titulo IS DISTINCT FROM OLD.titulo
    OR NEW.legenda IS DISTINCT FROM OLD.legenda
    OR NEW.copy_text IS DISTINCT FROM OLD.copy_text
    OR NEW.roteiro IS DISTINCT FROM OLD.roteiro
    OR NEW.direcao_arte IS DISTINCT FROM OLD.direcao_arte
    OR NEW.cta IS DISTINCT FROM OLD.cta
    OR NEW.capa_url IS DISTINCT FROM OLD.capa_url
    OR NEW.data_publicacao IS DISTINCT FROM OLD.data_publicacao
    OR NEW.hora_publicacao IS DISTINCT FROM OLD.hora_publicacao
    OR NEW.checklist IS DISTINCT FROM OLD.checklist
    OR NEW.localizacao IS DISTINCT FROM OLD.localizacao
    OR NEW.tags IS DISTINCT FROM OLD.tags
    OR NEW.observacoes IS DISTINCT FROM OLD.observacoes
    OR NEW.responsavel_email IS DISTINCT FROM OLD.responsavel_email
    OR NEW.responsavel_user_id IS DISTINCT FROM OLD.responsavel_user_id
    OR NEW.pilar_id IS DISTINCT FROM OLD.pilar_id
    OR NEW.estrategia_id IS DISTINCT FROM OLD.estrategia_id
    OR NEW.kanban_ordem IS DISTINCT FROM OLD.kanban_ordem
    OR NEW.published_at IS DISTINCT FROM OLD.published_at
    OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
    OR NEW.ai_metadata IS DISTINCT FROM OLD.ai_metadata
    OR NEW.integration_metadata IS DISTINCT FROM OLD.integration_metadata
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Clientes só podem alterar status via fluxo de aprovação.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'aguardando_aprovacao'
      AND NEW.status IN ('aguardando_material', 'roteiro') THEN
      RETURN NEW;
    END IF;
    IF OLD.status = 'aguardando_aprovacao_final'
      AND NEW.status IN ('agendado', 'producao') THEN
      RETURN NEW;
    END IF;
    IF OLD.status = 'aguardando_material'
      AND NEW.status = 'producao' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status não permitida para clientes (% -> %).',
      OLD.status, NEW.status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Path: content-cards/{cardId}/{arquivo}
DROP POLICY IF EXISTS editorial_media_content_cards_client ON storage.objects;
CREATE POLICY editorial_media_content_cards_client ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'editorial-media'
    AND split_part(name, '/', 1) = 'content-cards'
    AND split_part(name, '/', 2) IN (
      SELECT id::text FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  )
  WITH CHECK (
    bucket_id = 'editorial-media'
    AND split_part(name, '/', 1) = 'content-cards'
    AND split_part(name, '/', 2) IN (
      SELECT id::text FROM public.content_cards
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
         OR cliente_nome IN (SELECT cliente_nome FROM public.current_user_clientes())
    )
  );
