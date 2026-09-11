-- =========================================================
-- 52_base_metricas_make_schema.sql
-- Espelho versionado do layout de produção. Sem migrar dados.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.base_metricas_make (
  id bigserial PRIMARY KEY,
  data date NOT NULL,
  cliente text NOT NULL,
  plataforma text NOT NULL,
  metrica text NOT NULL,
  valor numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  campanha text
);

GRANT SELECT ON public.base_metricas_make TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.base_metricas_make TO service_role;
