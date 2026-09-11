-- =========================================================
-- 63_crm_ingest_api.sql
-- API de ingestão: tokens por marca + kinds/places de canal (form, e-mail, ligação).
-- Não altera Conteúdos nem Hub de métricas. Hub nunca escreve Make.
-- =========================================================

ALTER TYPE public.crm_signal_kind ADD VALUE IF NOT EXISTS 'form';
ALTER TYPE public.crm_signal_kind ADD VALUE IF NOT EXISTS 'email';
ALTER TYPE public.crm_signal_kind ADD VALUE IF NOT EXISTS 'call';
ALTER TYPE public.crm_signal_kind ADD VALUE IF NOT EXISTS 'other';

ALTER TYPE public.crm_signal_place ADD VALUE IF NOT EXISTS 'web';
ALTER TYPE public.crm_signal_place ADD VALUE IF NOT EXISTS 'phone';

CREATE TABLE IF NOT EXISTS public.crm_ingest_tokens (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  label                 text NOT NULL DEFAULT 'API',
  token_prefix          text NOT NULL,
  token_hash            text NOT NULL,
  last_used_at          timestamptz,
  revoked_at            timestamptz,
  created_by            uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS crm_ingest_tokens_cadastro_idx
  ON public.crm_ingest_tokens (cadastro_cliente_id)
  WHERE revoked_at IS NULL;

GRANT ALL ON public.crm_ingest_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.crm_ingest_tokens TO authenticated;

ALTER TABLE public.crm_ingest_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_ingest_tokens_admin_all ON public.crm_ingest_tokens;
CREATE POLICY crm_ingest_tokens_admin_all ON public.crm_ingest_tokens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
