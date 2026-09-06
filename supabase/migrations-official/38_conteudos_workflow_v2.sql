-- =========================================================
-- 38_conteudos_workflow_v2.sql  (aditivo, idempotente)
-- Conteúdos: novos status enum, campos editoriais, publish_*, media_role
-- Remap de dados: ver 39_conteudos_workflow_remap.sql
-- =========================================================

DO $$ BEGIN
  ALTER TYPE public.content_card_status ADD VALUE IF NOT EXISTS 'roteiro';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.content_card_status ADD VALUE IF NOT EXISTS 'aguardando_material';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.content_card_status ADD VALUE IF NOT EXISTS 'aguardando_aprovacao_final';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.content_card_status ADD VALUE IF NOT EXISTS 'agendado';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.content_cards
  ALTER COLUMN status SET DEFAULT 'aguardando_aprovacao';

ALTER TABLE public.content_cards
  ADD COLUMN IF NOT EXISTS linha_editorial text,
  ADD COLUMN IF NOT EXISTS tema text,
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_target text,
  ADD COLUMN IF NOT EXISTS external_post_id text,
  ADD COLUMN IF NOT EXISTS publish_container_id text,
  ADD COLUMN IF NOT EXISTS publish_error text,
  ADD COLUMN IF NOT EXISTS publish_attempted_at timestamptz;

ALTER TABLE public.content_cards
  DROP CONSTRAINT IF EXISTS content_cards_publish_status_check;

ALTER TABLE public.content_cards
  ADD CONSTRAINT content_cards_publish_status_check
  CHECK (publish_status IN (
    'none', 'queued', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'
  ));

DO $$ BEGIN
  ALTER TYPE public.content_card_event_type ADD VALUE IF NOT EXISTS 'publish_queued';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.content_card_event_type ADD VALUE IF NOT EXISTS 'publish_succeeded';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.content_card_event_type ADD VALUE IF NOT EXISTS 'publish_failed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.content_card_event_type ADD VALUE IF NOT EXISTS 'material_submitted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.content_card_attachments
  DROP CONSTRAINT IF EXISTS content_card_attachments_media_role_check;

ALTER TABLE public.content_card_attachments
  ADD CONSTRAINT content_card_attachments_media_role_check
  CHECK (media_role IN ('preview', 'attachment', 'cliente_material', 'final'));

-- Remap de dados: ver 39 (desliga trigger client_guard)