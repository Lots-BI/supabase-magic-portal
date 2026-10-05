-- =========================================================
-- 74_lots_pendencias_fila.sql
-- O cliente vê algumas tarefas da operação.
-- O aviso pode ir para quem faz, e não para o proprietário.
-- Pedido de acesso não tem cadastro de cliente.
-- =========================================================

ALTER TABLE public.lots_pendencias
  ADD COLUMN IF NOT EXISTS visivel_cliente boolean NOT NULL DEFAULT false;

ALTER TABLE public.lots_pendencias
  ADD COLUMN IF NOT EXISTS aviso_user_id uuid;

ALTER TABLE public.lots_pendencias
  ADD COLUMN IF NOT EXISTS aviso_entrega date;

ALTER TABLE public.lots_pendencias
  ALTER COLUMN cadastro_cliente_id DROP NOT NULL;

ALTER TABLE public.lots_pendencia_log
  ALTER COLUMN cadastro_cliente_id DROP NOT NULL;
