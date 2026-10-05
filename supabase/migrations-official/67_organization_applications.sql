-- =========================================================
-- 67_organization_applications.sql
-- Pedido de acesso. Não cria organização.
-- Escrita só via service role: o solicitante não altera status.
-- Não toca em fin_*.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.organization_applications (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        text NOT NULL,
  document_digits  text NOT NULL,
  document_kind    text NOT NULL CHECK (document_kind IN ('cpf', 'cnpj')),
  whatsapp_digits  text NOT NULL,
  email            text NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_applications_status
  ON public.organization_applications (status, created_at DESC);

REVOKE ALL ON TABLE public.organization_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organization_applications TO authenticated;
GRANT ALL ON TABLE public.organization_applications TO service_role;

ALTER TABLE public.organization_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_applications_select ON public.organization_applications;
CREATE POLICY organization_applications_select ON public.organization_applications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_owner(auth.uid())
  );
