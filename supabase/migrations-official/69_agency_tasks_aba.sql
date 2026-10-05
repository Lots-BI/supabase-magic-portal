-- =========================================================
-- 69_agency_tasks_aba.sql
-- Aba da Lots BI onde a tarefa deve ser feita.
-- Null = tarefa antiga, ainda sem destino. Não toca em fin_*.
-- =========================================================

ALTER TABLE public.agency_tasks
  ADD COLUMN IF NOT EXISTS aba text;

ALTER TABLE public.agency_tasks
  DROP CONSTRAINT IF EXISTS agency_tasks_aba_check;

ALTER TABLE public.agency_tasks
  ADD CONSTRAINT agency_tasks_aba_check
  CHECK (
    aba IS NULL
    OR aba IN ('conteudos', 'crm', 'relatorio', 'diretrizes', 'conexoes')
  );
