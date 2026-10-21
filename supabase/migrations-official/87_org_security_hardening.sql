-- =========================================================
-- 87_org_security_hardening.sql
--
-- REVOKE FROM PUBLIC no Postgres não tira EXECUTE de anon/authenticated.
-- access_invalidate_auth_sessions derrubava sessão de qualquer UUID.
-- cliente_aliases_select_auth (USING true) vazava o mapa de nomes.
-- Não toca em fin_*.
-- =========================================================

REVOKE ALL ON FUNCTION public.access_invalidate_auth_sessions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.access_invalidate_auth_sessions(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_invalidate_auth_sessions(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.ensure_owner_admin_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_owner_admin_for_user(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_owner_admin_for_user(uuid) TO service_role;

DROP POLICY IF EXISTS cliente_aliases_select_auth ON public.cliente_aliases;
