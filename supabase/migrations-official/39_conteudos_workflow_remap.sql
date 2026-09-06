-- =========================================================
-- 39_conteudos_workflow_remap.sql
-- Remap legado (desliga trigger de cliente temporariamente)
-- =========================================================

ALTER TABLE public.content_cards DISABLE TRIGGER content_cards_client_guard;

UPDATE public.content_cards SET status = 'producao' WHERE status::text = 'edicao';
UPDATE public.content_cards SET status = 'agendado' WHERE status::text = 'aprovado';

ALTER TABLE public.content_cards ENABLE TRIGGER content_cards_client_guard;
