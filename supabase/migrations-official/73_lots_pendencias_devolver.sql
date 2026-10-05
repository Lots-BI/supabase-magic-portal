-- =========================================================
-- 73_lots_pendencias_devolver.sql
-- Uma pendência devolvida do log permanece aberta até a
-- condição da plataforma voltar a valer. O log guarda o
-- dono e a repetição para a linha voltar igual.
-- =========================================================

ALTER TABLE public.lots_pendencias
  ADD COLUMN IF NOT EXISTS mantida boolean NOT NULL DEFAULT false;

ALTER TABLE public.lots_pendencia_log
  ADD COLUMN IF NOT EXISTS responsavel_user_id uuid;

ALTER TABLE public.lots_pendencia_log
  ADD COLUMN IF NOT EXISTS repete text;
