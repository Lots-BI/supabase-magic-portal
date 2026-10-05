-- =========================================================
-- 70_agency_tasks_recorrencia.sql
-- Repetição semanal (ex.: toda segunda) e o dia em que o
-- proprietário já foi avisado desta entrega.
-- =========================================================

ALTER TABLE public.agency_tasks
  ADD COLUMN IF NOT EXISTS recorrencia text;

ALTER TABLE public.agency_tasks
  ADD COLUMN IF NOT EXISTS recorrencia_dia smallint;

ALTER TABLE public.agency_tasks
  ADD COLUMN IF NOT EXISTS aviso_entrega date;

ALTER TABLE public.agency_tasks
  DROP CONSTRAINT IF EXISTS agency_tasks_recorrencia_check;

ALTER TABLE public.agency_tasks
  ADD CONSTRAINT agency_tasks_recorrencia_check
  CHECK (
    (recorrencia IS NULL AND recorrencia_dia IS NULL)
    OR (
      recorrencia = 'semanal'
      AND recorrencia_dia BETWEEN 0 AND 6
    )
  );
