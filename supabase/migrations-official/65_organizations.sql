-- =========================================================
-- 65_organizations.sql  (aditivo, idempotente)
-- Fundação de organizações. NÃO altera current_user_clientes(),
-- has_role() nem policies de métricas, Hub ou conteúdo.
-- Aplicada sozinha, a Lots continua lendo como hoje.
--
-- Limite conhecido: a chave de métrica continua sendo o nome do
-- cliente. O índice único impede o mesmo nome dentro de uma org.
-- O mesmo texto em duas orgs ainda apontaria para a mesma linha
-- de base_metricas_*. A aplicação recusa esse caso.
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.organization_member_role AS ENUM (
    'owner',
    'gestor',
    'social_media',
    'gestor_trafego',
    'financeiro',
    'visualizador',
    'cliente'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             public.organization_member_role NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON public.organization_members (user_id);

ALTER TABLE public.cadastro_clientes
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cadastro_clientes_organization_id_fkey'
  ) THEN
    ALTER TABLE public.cadastro_clientes
      ADD CONSTRAINT cadastro_clientes_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Leitura usada pelas policies desta migration. SECURITY DEFINER evita
-- recursão de RLS em organization_members. Não decide acesso a clientes.
CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_org_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role IN (
        'owner'::public.organization_member_role,
        'gestor'::public.organization_member_role,
        'social_media'::public.organization_member_role,
        'gestor_trafego'::public.organization_member_role,
        'financeiro'::public.organization_member_role,
        'visualizador'::public.organization_member_role
      )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_organization_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_organization_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_staff() TO authenticated, service_role;

REVOKE ALL ON TABLE public.organizations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;

REVOKE ALL ON TABLE public.organization_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organization_members TO authenticated;
GRANT ALL ON TABLE public.organization_members TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.is_platform_owner(auth.uid())
    OR id IN (SELECT public.current_user_organization_ids())
  );

-- Sem policy de escrita: authenticated não insere org nesta migration.
DROP POLICY IF EXISTS organization_members_select ON public.organization_members;
CREATE POLICY organization_members_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_owner(auth.uid())
    OR (
      public.is_org_staff()
      AND organization_id IN (SELECT public.current_user_organization_ids())
    )
  );

-- ---------- backfill: Lots é a primeira organização ----------
INSERT INTO public.organizations (name, slug)
SELECT 'Lots', 'lots'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE slug = 'lots'
);

-- Só preenche nulos enquanto existe uma única org (a Lots).
-- Reexecutar depois de nascer outra org não puxa cliente novo para a Lots.
-- O trigger de updated_at não deve marcar o catálogo inteiro como editado.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_cadastro_clientes_set_updated_at'
      AND tgrelid = 'public.cadastro_clientes'::regclass
  ) THEN
    ALTER TABLE public.cadastro_clientes DISABLE TRIGGER tg_cadastro_clientes_set_updated_at;
  END IF;
END $$;

UPDATE public.cadastro_clientes AS cc
SET organization_id = o.id
FROM public.organizations AS o
WHERE o.slug = 'lots'
  AND cc.organization_id IS NULL
  AND (SELECT count(*) FROM public.organizations) = 1;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tg_cadastro_clientes_set_updated_at'
      AND tgrelid = 'public.cadastro_clientes'::regclass
      AND tgenabled = 'D'
  ) THEN
    ALTER TABLE public.cadastro_clientes ENABLE TRIGGER tg_cadastro_clientes_set_updated_at;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS cadastro_clientes_org_nome_unique
  ON public.cadastro_clientes (organization_id, lower(nome_cliente))
  WHERE organization_id IS NOT NULL;

-- app_role de produção só tem admin e cliente. social_media não é valor
-- desse enum; o papel de conteúdo da outra agência nasce em organization_members.
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, ur.user_id, 'owner'::public.organization_member_role
FROM public.user_roles AS ur
JOIN public.organizations AS o ON o.slug = 'lots'
WHERE ur.role = 'admin'::public.app_role
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = EXCLUDED.role
WHERE organization_members.role IS DISTINCT FROM EXCLUDED.role;

INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT DISTINCT cc.organization_id, ca.user_id, 'cliente'::public.organization_member_role
FROM public.client_access AS ca
JOIN public.cadastro_clientes AS cc
  ON cc.id = ca.cadastro_cliente_id
  OR (
    ca.cadastro_cliente_id IS NULL
    AND cc.nome_cliente = ca.cliente_nome
  )
WHERE cc.organization_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

DO $$
DECLARE
  missing integer;
  admins_missing integer;
BEGIN
  SELECT count(*) INTO missing
  FROM public.cadastro_clientes
  WHERE organization_id IS NULL;

  IF missing <> 0 AND (SELECT count(*) FROM public.organizations) = 1 THEN
    RAISE EXCEPTION 'cadastro_clientes sem organization_id: %', missing;
  END IF;

  SELECT count(*) INTO admins_missing
  FROM public.user_roles AS ur
  WHERE ur.role = 'admin'::public.app_role
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_members AS om
      JOIN public.organizations AS o ON o.id = om.organization_id
      WHERE o.slug = 'lots'
        AND om.user_id = ur.user_id
        AND om.role = 'owner'::public.organization_member_role
    );

  IF admins_missing <> 0 THEN
    RAISE EXCEPTION 'admins sem membership owner na Lots: %', admins_missing;
  END IF;
END $$;
