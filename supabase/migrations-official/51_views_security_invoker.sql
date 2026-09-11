-- =========================================================
-- 51_views_security_invoker.sql
-- Views vw_* restantes passam a security_invoker (RLS das tabelas-base).
-- =========================================================

ALTER VIEW IF EXISTS public.vw_metricas SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_metricas_normalizadas SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_overview_cliente SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_clientes_ativos SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_instagram_normalizada_prefer_hub SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_google_business_diario SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_content_workflow_library SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_content_workflow_ops_status SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_estrategia_editorial_stats SET (security_invoker = true);
