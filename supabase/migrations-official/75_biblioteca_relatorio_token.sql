-- =========================================================
-- 75_biblioteca_relatorio_token.sql
-- Pastas da biblioteca, análise do relatório e vencimento
-- do token. Acesso só pelo service role.
-- =========================================================

ALTER TABLE public.content_card_attachments
  ADD COLUMN IF NOT EXISTS downloaded_at timestamptz;

CREATE TABLE IF NOT EXISTS public.content_library_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL,
  parent_id uuid REFERENCES public.content_library_folders (id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_library_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL,
  folder_id uuid REFERENCES public.content_library_folders (id) ON DELETE SET NULL,
  nome text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_library_folders_cliente_idx
  ON public.content_library_folders (cadastro_cliente_id, parent_id);

CREATE INDEX IF NOT EXISTS content_library_files_cliente_idx
  ON public.content_library_files (cadastro_cliente_id, folder_id);

CREATE TABLE IF NOT EXISTS public.relatorio_analises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL,
  plataforma text NOT NULL,
  semana date NOT NULL,
  html text NOT NULL DEFAULT '',
  autor_user_id uuid,
  enviada_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cadastro_cliente_id, plataforma, semana)
);

CREATE TABLE IF NOT EXISTS public.relatorio_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id bigint NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  html text NOT NULL DEFAULT '',
  autor_user_id uuid,
  enviada_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cadastro_cliente_id, periodo_inicio, periodo_fim)
);

ALTER TABLE public.ph_connections
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

ALTER TABLE public.content_library_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_library_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_ocorrencias ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.content_library_folders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.content_library_files FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.relatorio_analises FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.relatorio_ocorrencias FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.content_library_folders TO service_role;
GRANT ALL ON TABLE public.content_library_files TO service_role;
GRANT ALL ON TABLE public.relatorio_analises TO service_role;
GRANT ALL ON TABLE public.relatorio_ocorrencias TO service_role;
