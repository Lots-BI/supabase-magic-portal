-- =========================================================
-- 72_lots_pendencias_edicao.sql
-- Edição manual da pendência. A sincronização não reescreve
-- a linha depois que alguém altera com a caixinha marcada.
-- Uma entrega manual fica pausada até a pendência real sumir,
-- para não voltar no próximo ciclo.
-- =========================================================

ALTER TABLE public.lots_pendencias
  ADD COLUMN IF NOT EXISTS repete text;

ALTER TABLE public.lots_pendencias
  ADD COLUMN IF NOT EXISTS editada boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.lots_pendencia_pausa (
  chave text PRIMARY KEY,
  pausada_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lots_pendencia_pausa ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lots_pendencia_pausa FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.lots_pendencia_pausa TO service_role;
