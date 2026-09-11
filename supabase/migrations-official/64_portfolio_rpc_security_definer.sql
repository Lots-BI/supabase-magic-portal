-- =========================================================
-- 64_portfolio_rpc_security_definer.sql
--
-- Produção: "canceling statement due to statement timeout" em
-- /dashboard, /admin e dashboards de plataforma.
--
-- Os RPCs 56/57/60 são SECURITY INVOKER. PostgREST abre
-- base_metricas_hub ∪ make com RLS; has_role / is_platform_owner
-- rodam no startup da policy por linha (~8k rows) e estouram o
-- timeout do API (~8–20s), mesmo com 2min no Postgres.
--
-- Os corpos já filtram current_user_clientes() / p_cliente.
-- DEFINER (owner postgres) lê as tabelas sem RLS por linha;
-- o recorte de acesso permanece no SQL.
-- =========================================================

ALTER FUNCTION public.portfolio_overview(date, date) SECURITY DEFINER;
ALTER FUNCTION public.portfolio_clientes_ativos() SECURITY DEFINER;
ALTER FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) SECURITY DEFINER;
ALTER FUNCTION public.dashboard_coverage(text, date) SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.portfolio_overview(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portfolio_overview(date, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.portfolio_clientes_ativos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portfolio_clientes_ativos() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_prefer_hub_long(text, text, date, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.dashboard_coverage(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_coverage(text, date) TO authenticated, service_role;
