-- =========================================================
-- 40_conteudos_create_and_client_guard.sql  (aditivo, idempotente)
-- - Default de create: roteiro (rascunho até "Enviar para aprovação")
-- - Client guard alinhado às transições v2 do workflow Conteúdos
-- =========================================================

ALTER TABLE public.content_cards
  ALTER COLUMN status SET DEFAULT 'roteiro';

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
    -- Aprovar / pedir alterações no roteiro
    IF OLD.status = 'aguardando_aprovacao'
      AND NEW.status IN ('aguardando_material', 'roteiro') THEN
      RETURN NEW;
    END IF;
    -- Aprovar / pedir alterações na peça final
    IF OLD.status = 'aguardando_aprovacao_final'
      AND NEW.status IN ('agendado', 'producao') THEN
      RETURN NEW;
    END IF;
    -- Enviar material → produção
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
