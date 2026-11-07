-- =========================================================
-- 91_report_analyst.sql
--
-- Uso diário e auditoria leve do analista do relatório.
-- O app grava asked_on com o dia em America/Sao_Paulo.
-- Cada usuário lê e insere só as próprias linhas.
-- Não altera Make, Hub nem views de métrica.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.report_analyst_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes (id) ON DELETE CASCADE,
  asked_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_analyst_usage_day_idx
  ON public.report_analyst_usage (user_id, cadastro_cliente_id, asked_on);

CREATE TABLE IF NOT EXISTS public.report_analyst_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  cadastro_cliente_id bigint NOT NULL REFERENCES public.cadastro_clientes (id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 2000),
  answer text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 8000),
  period_from date NOT NULL,
  period_to date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_analyst_threads_user_idx
  ON public.report_analyst_threads (user_id, cadastro_cliente_id, created_at DESC);

ALTER TABLE public.report_analyst_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_analyst_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_analyst_usage_select_own ON public.report_analyst_usage;
CREATE POLICY report_analyst_usage_select_own
  ON public.report_analyst_usage
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS report_analyst_usage_insert_own ON public.report_analyst_usage;
CREATE POLICY report_analyst_usage_insert_own
  ON public.report_analyst_usage
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS report_analyst_threads_select_own ON public.report_analyst_threads;
CREATE POLICY report_analyst_threads_select_own
  ON public.report_analyst_threads
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS report_analyst_threads_insert_own ON public.report_analyst_threads;
CREATE POLICY report_analyst_threads_insert_own
  ON public.report_analyst_threads
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.report_analyst_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.report_analyst_threads FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.report_analyst_usage TO authenticated;
GRANT SELECT, INSERT ON TABLE public.report_analyst_threads TO authenticated;
GRANT ALL ON TABLE public.report_analyst_usage TO service_role;
GRANT ALL ON TABLE public.report_analyst_threads TO service_role;

DO $$
DECLARE seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('public.report_analyst_usage', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', seq_name);
    EXECUTE format('GRANT ALL ON SEQUENCE %s TO service_role', seq_name);
  END IF;
END $$;

COMMENT ON TABLE public.report_analyst_usage IS
  'Perguntas do analista do relatório por usuário, cliente e dia BRT (asked_on).';
COMMENT ON TABLE public.report_analyst_threads IS
  'Auditoria leve: pergunta, resposta e recorte. Sem o contexto enviado ao modelo.';
