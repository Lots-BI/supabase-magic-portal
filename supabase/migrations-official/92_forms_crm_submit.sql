-- =========================================================
-- 92_forms_crm_submit.sql
-- Formulários de landing → CRM por cliente (multi-tenant).
-- Uma tabela `forms` para todos os clientes; isolamento por
-- cadastro_cliente_id + RLS. INSERT só via service role
-- (API Lots /api/forms/v1/submit) — sem anon key nas landings.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.forms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  email       text,
  instagram   text,
  source      text NOT NULL DEFAULT 'landing',
  page_url    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS cadastro_cliente_id bigint
    REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS form_key text NOT NULL DEFAULT 'default';

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS telefone text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS mensagem text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS utm_source text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS utm_medium text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS utm_campaign text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS utm_content text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS utm_term text;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS crm_person_id uuid
    REFERENCES public.crm_people(id) ON DELETE SET NULL;

-- Envios de teste da landing Lots BI → Agência Lots (id 15), se existir.
UPDATE public.forms f
SET cadastro_cliente_id = c.id,
    form_key = COALESCE(NULLIF(TRIM(f.form_key), ''), 'landing-lotsbi'),
    source = COALESCE(NULLIF(TRIM(f.source), ''), 'landing')
FROM public.cadastro_clientes c
WHERE f.cadastro_cliente_id IS NULL
  AND c.nome_cliente = 'Agência Lots';

-- Se ainda houver linhas sem cliente, remove (não devem existir em prod limpa).
-- Mantém aditivo: só falha NOT NULL depois do backfill quando possível.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.forms WHERE cadastro_cliente_id IS NULL
  ) AND EXISTS (
    SELECT 1 FROM public.cadastro_clientes WHERE nome_cliente = 'Agência Lots'
  ) THEN
    UPDATE public.forms
    SET cadastro_cliente_id = (
      SELECT id FROM public.cadastro_clientes WHERE nome_cliente = 'Agência Lots' LIMIT 1
    )
    WHERE cadastro_cliente_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.forms
  ALTER COLUMN cadastro_cliente_id SET NOT NULL;

-- email/instagram deixam de ser NOT NULL (form pode ter só telefone).
ALTER TABLE public.forms ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.forms ALTER COLUMN instagram DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS forms_cadastro_form_external_uidx
  ON public.forms (cadastro_cliente_id, form_key, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS forms_cadastro_created_idx
  ON public.forms (cadastro_cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS forms_cadastro_form_key_idx
  ON public.forms (cadastro_cliente_id, form_key);

COMMENT ON TABLE public.forms IS
  'Envios brutos de formulário (landing). Multi-tenant por cadastro_cliente_id. Escrita só via API Lots.';

GRANT ALL ON public.forms TO service_role;
GRANT SELECT ON public.forms TO authenticated;

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- Fecha INSERT anônimo (chave Supabase não deve ser usada nas landings).
DROP POLICY IF EXISTS forms_insert_anon ON public.forms;
DROP POLICY IF EXISTS forms_select_admin ON public.forms;
DROP POLICY IF EXISTS forms_select_scoped ON public.forms;
DROP POLICY IF EXISTS forms_admin_all ON public.forms;

CREATE POLICY forms_admin_all ON public.forms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY forms_select_scoped ON public.forms
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
  );
