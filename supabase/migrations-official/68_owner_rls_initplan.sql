-- =========================================================
-- 68_owner_rls_initplan.sql
-- O dono da plataforma passava em cada linha por staff_cadastro_in_scope,
-- card_in_scope e connection_in_scope. Em tabelas grandes isso estourava
-- o tempo do PostgREST depois do login. A checagem do dono passa a ser
-- um InitPlan (uma vez por consulta). O resultado de quem pode ver o quê
-- não muda. Não toca em fin_*.
-- =========================================================

DO $$
DECLARE
  r record;
  cmd text;
  role_list text;
  using_sql text;
  check_sql text;
  wrapped_using text;
  wrapped_check text;
BEGIN
  FOR r IN
    SELECT
      n.nspname,
      c.relname,
      pol.polname,
      pol.polcmd,
      pol.polroles,
      pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname NOT LIKE 'fin\_%'
      AND (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '')
          ~ 'staff_cadastro_in_scope|card_in_scope|connection_in_scope|plano_in_scope|metric_cliente_in_scope'
        OR coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
          ~ 'staff_cadastro_in_scope|card_in_scope|connection_in_scope|plano_in_scope|metric_cliente_in_scope'
      )
  LOOP
    IF coalesce(r.using_expr, '') LIKE '%SELECT is_platform_owner%'
       OR coalesce(r.using_expr, '') LIKE '%SELECT public.is_platform_owner%'
       OR coalesce(r.check_expr, '') LIKE '%SELECT is_platform_owner%'
       OR coalesce(r.check_expr, '') LIKE '%SELECT public.is_platform_owner%'
    THEN
      CONTINUE;
    END IF;

    cmd := CASE r.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
      ELSE NULL
    END;
    IF cmd IS NULL THEN
      RAISE EXCEPTION 'comando de policy desconhecido em %.%', r.relname, r.polname;
    END IF;

    IF r.polroles = '{0}'::oid[] THEN
      role_list := 'PUBLIC';
    ELSE
      SELECT string_agg(quote_ident(rol.rolname), ', ')
        INTO role_list
      FROM pg_roles rol
      WHERE rol.oid = ANY (r.polroles);
    END IF;

    wrapped_using := CASE
      WHEN r.using_expr IS NULL THEN NULL
      ELSE format(
        '((SELECT public.is_platform_owner(auth.uid())) OR (%s))',
        r.using_expr
      )
    END;
    wrapped_check := CASE
      WHEN r.check_expr IS NULL THEN NULL
      ELSE format(
        '((SELECT public.is_platform_owner(auth.uid())) OR (%s))',
        r.check_expr
      )
    END;

    using_sql := CASE WHEN wrapped_using IS NULL THEN '' ELSE format('USING (%s)', wrapped_using) END;
    check_sql := CASE WHEN wrapped_check IS NULL THEN '' ELSE format('WITH CHECK (%s)', wrapped_check) END;

    EXECUTE format('DROP POLICY %I ON %I.%I', r.polname, r.nspname, r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s %s %s',
      r.polname,
      r.nspname,
      r.relname,
      cmd,
      role_list,
      using_sql,
      check_sql
    );
  END LOOP;
END $$;
