-- =========================================================
-- 35_cliente_diretrizes.sql  (aditivo, idempotente)
-- PDF de diretrizes da marca por cliente (upload admin, leitura no portal).
-- Não altera cadastro_clientes nem o brand book Figma legado.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.cliente_diretrizes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id  bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  storage_path         text NOT NULL,
  file_name            text NOT NULL,
  mime_type            text NOT NULL DEFAULT 'application/pdf',
  file_size            bigint NOT NULL CHECK (file_size > 0),
  uploaded_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cadastro_cliente_id)
);

CREATE INDEX IF NOT EXISTS cliente_diretrizes_uploaded_at_idx
  ON public.cliente_diretrizes (uploaded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_diretrizes TO authenticated;
GRANT ALL ON public.cliente_diretrizes TO service_role;

ALTER TABLE public.cliente_diretrizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cliente_diretrizes_admin_all ON public.cliente_diretrizes;
CREATE POLICY cliente_diretrizes_admin_all ON public.cliente_diretrizes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS cliente_diretrizes_client_select ON public.cliente_diretrizes;
CREATE POLICY cliente_diretrizes_client_select ON public.cliente_diretrizes
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
  );

-- ---------- Storage bucket (privado; PDF até 50 MB) ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diretrizes-marca',
  'diretrizes-marca',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = false;

DROP POLICY IF EXISTS diretrizes_marca_admin_all ON storage.objects;
CREATE POLICY diretrizes_marca_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'diretrizes-marca' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'diretrizes-marca' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS diretrizes_marca_client_select ON storage.objects;
CREATE POLICY diretrizes_marca_client_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'diretrizes-marca'
    AND (storage.foldername(name))[1]::bigint IN (SELECT public.current_user_cadastro_cliente_ids())
  );

DROP POLICY IF EXISTS diretrizes_marca_service_role ON storage.objects;
CREATE POLICY diretrizes_marca_service_role ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'diretrizes-marca')
  WITH CHECK (bucket_id = 'diretrizes-marca');

-- Validação:
-- SELECT id FROM storage.buckets WHERE id = 'diretrizes-marca';
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'cliente_diretrizes';
