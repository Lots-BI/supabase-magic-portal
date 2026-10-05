-- =========================================================
-- 71_lots_pendencias.sql
-- Pendências geradas pela plataforma. Somem sozinhas quando
-- a ação correspondente deixa de existir, e ficam no log.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.lots_pendencias (
  chave text PRIMARY KEY,
  titulo text NOT NULL,
  cadastro_cliente_id bigint NOT NULL,
  cliente_nome text NOT NULL,
  responsavel_user_id uuid,
  responsavel_nome text,
  entrega date,
  aba text NOT NULL,
  lado text NOT NULL,
  href text NOT NULL,
  repete text,
  editada boolean NOT NULL DEFAULT false,
  aberta_em timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz,
  CONSTRAINT lots_pendencias_lado_check CHECK (lado IN ('admin', 'cliente'))
);

CREATE INDEX IF NOT EXISTS lots_pendencias_abertas_idx
  ON public.lots_pendencias (concluida_em, entrega);

CREATE TABLE IF NOT EXISTS public.lots_pendencia_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  titulo text NOT NULL,
  cadastro_cliente_id bigint NOT NULL,
  cliente_nome text NOT NULL,
  responsavel_nome text,
  entrega date,
  aba text NOT NULL,
  lado text NOT NULL,
  href text NOT NULL,
  concluida_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lots_pendencia_log_quando_idx
  ON public.lots_pendencia_log (concluida_em DESC);

ALTER TABLE public.lots_pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots_pendencia_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lots_pendencias FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.lots_pendencia_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.lots_pendencias TO service_role;
GRANT ALL ON TABLE public.lots_pendencia_log TO service_role;
