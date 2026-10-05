-- =========================================================
-- 77_app_live_signals.sql
-- Sinal leve de mudança para o Supabase Realtime.
-- Não carrega o registro alterado: só o escopo e os ids,
-- para a tela aberta buscar de novo o que mudou.
-- Admin e cliente recebem o mesmo fluxo, filtrado por RLS.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.app_live_signals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope text NOT NULL,
  audience text NOT NULL,
  organization_id uuid,
  cadastro_cliente_id bigint,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_live_signals_audience_check
    CHECK (audience IN ('staff', 'all', 'everyone'))
);

CREATE INDEX IF NOT EXISTS app_live_signals_recent_idx
  ON public.app_live_signals (scope, cadastro_cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_live_signals_created_idx
  ON public.app_live_signals (created_at);

ALTER TABLE public.app_live_signals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_live_signals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.app_live_signals TO authenticated;
GRANT ALL ON TABLE public.app_live_signals TO service_role;

DROP POLICY IF EXISTS app_live_signals_select ON public.app_live_signals;
CREATE POLICY app_live_signals_select ON public.app_live_signals
  FOR SELECT TO authenticated
  USING (
    public.is_platform_owner(auth.uid())
    OR audience = 'everyone'
    OR (user_id IS NOT NULL AND user_id = auth.uid())
    OR (
      audience = 'all'
      AND cadastro_cliente_id IS NOT NULL
      AND cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
    )
    OR (
      audience IN ('staff', 'all')
      AND public.is_org_staff()
      AND (
        organization_id IS NULL
        OR organization_id IN (SELECT public.current_user_organization_ids())
      )
      AND (
        cadastro_cliente_id IS NULL
        OR public.staff_cadastro_in_scope(cadastro_cliente_id)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.emit_app_live_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rowj jsonb;
  v_scope text;
  v_audience text;
  v_cliente bigint;
  v_org uuid;
  v_user uuid;
  v_flag text;
  v_seen text;
  v_cliente_nome text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NULL;
  END IF;

  rowj := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  v_scope := CASE TG_TABLE_NAME
    WHEN 'agency_tasks' THEN 'tasks'
    WHEN 'lots_pendencias' THEN 'tasks'
    WHEN 'lots_pendencia_log' THEN 'tasks'
    WHEN 'lots_pendencia_pausa' THEN 'tasks'
    WHEN 'content_cards' THEN 'content'
    WHEN 'content_card_events' THEN 'content'
    WHEN 'content_card_attachments' THEN 'content'
    WHEN 'editorial_pillars' THEN 'content'
    WHEN 'story_plan_rows' THEN 'content'
    WHEN 'content_library_files' THEN 'content'
    WHEN 'content_library_folders' THEN 'content'
    WHEN 'crm_people' THEN 'crm'
    WHEN 'crm_identities' THEN 'crm'
    WHEN 'crm_signals' THEN 'crm'
    WHEN 'crm_field_facts' THEN 'crm'
    WHEN 'crm_person_stats' THEN 'crm'
    WHEN 'crm_person_notes' THEN 'crm'
    WHEN 'crm_ingest_tokens' THEN 'crm'
    WHEN 'crm_ingest_cursors' THEN 'crm'
    WHEN 'crm_collector_state' THEN 'crm'
    WHEN 'relatorio_analises' THEN 'report'
    WHEN 'relatorio_ocorrencias' THEN 'report'
    WHEN 'cliente_diretrizes' THEN 'brand'
    WHEN 'planos_estrategicos' THEN 'plan'
    WHEN 'plano_objetivos' THEN 'plan'
    WHEN 'plano_estrategias' THEN 'plan'
    WHEN 'plano_objetivo_estrategias' THEN 'plan'
    WHEN 'plano_metric_refs' THEN 'plan'
    WHEN 'plano_hipoteses' THEN 'plan'
    WHEN 'plano_oportunidades' THEN 'plan'
    WHEN 'plano_decisoes' THEN 'plan'
    WHEN 'plano_aprendizados' THEN 'plan'
    WHEN 'plano_roadmap_marcos' THEN 'plan'
    WHEN 'plano_acoes' THEN 'plan'
    WHEN 'plano_eventos' THEN 'plan'
    WHEN 'plano_snapshots' THEN 'plan'
    WHEN 'plano_alinhamentos' THEN 'plan'
    WHEN 'cadastro_clientes' THEN 'clients'
    WHEN 'cliente_servicos' THEN 'clients'
    WHEN 'client_access' THEN 'clients'
    WHEN 'base_metricas_hub' THEN 'metrics'
    WHEN 'base_metricas_make' THEN 'metrics'
    WHEN 'ig_media' THEN 'metrics'
    WHEN 'ig_media_metrics_history' THEN 'metrics'
    WHEN 'cliente_aliases' THEN 'metrics'
    WHEN 'ph_connections' THEN 'connections'
    WHEN 'ph_timeline_events' THEN 'connections'
    WHEN 'ph_sync_runs' THEN 'connections'
    WHEN 'ph_identities' THEN 'connections'
    WHEN 'ph_metricas_source' THEN 'connections'
    WHEN 'app_notifications' THEN 'notifications'
    WHEN 'organization_applications' THEN 'access'
    WHEN 'organization_members' THEN 'access'
    WHEN 'organizations' THEN 'access'
    WHEN 'user_roles' THEN 'access'
    WHEN 'access_accounts' THEN 'access'
    WHEN 'profiles' THEN 'access'
    WHEN 'system_metadata' THEN 'access'
    WHEN 'servicos' THEN 'services'
    WHEN 'agency_notes' THEN 'agency'
    WHEN 'agency_leads' THEN 'agency'
    WHEN 'agency_projects' THEN 'agency'
    WHEN 'agency_client_tags' THEN 'agency'
    WHEN 'agency_timeline_events' THEN 'agency'
    WHEN 'agency_tags' THEN 'agency'
    WHEN 'fin_cobrancas' THEN 'finance'
    WHEN 'fin_cobranca_itens' THEN 'finance'
    WHEN 'fin_recibos' THEN 'finance'
    WHEN 'fin_pagamentos' THEN 'finance'
    WHEN 'fin_nfse' THEN 'finance'
    WHEN 'fin_nfse_eventos' THEN 'finance'
    WHEN 'fin_config' THEN 'finance'
    WHEN 'fin_dps_numeracao' THEN 'finance'
    WHEN 'core_feature_flags' THEN 'platform'
    ELSE NULL
  END;

  IF v_scope IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME IN (
    'agency_notes', 'agency_leads', 'agency_projects', 'agency_client_tags',
    'agency_timeline_events', 'agency_tags',
    'crm_ingest_tokens', 'crm_ingest_cursors', 'crm_collector_state',
    'ph_metricas_source',
    'organization_applications', 'organization_members', 'organizations',
    'user_roles', 'access_accounts', 'profiles', 'system_metadata',
    'servicos', 'core_feature_flags',
    'fin_cobrancas', 'fin_cobranca_itens', 'fin_recibos', 'fin_pagamentos',
    'fin_nfse', 'fin_nfse_eventos', 'fin_config', 'fin_dps_numeracao'
  ) THEN
    v_audience := 'staff';
  ELSIF TG_TABLE_NAME IN ('lots_pendencia_pausa', 'ig_media_metrics_history', 'cliente_aliases') THEN
    v_audience := 'everyone';
  ELSE
    v_audience := 'all';
  END IF;

  -- Histórico de métrica não tem cliente na linha. Um aviso por transação.
  IF TG_TABLE_NAME = 'ig_media_metrics_history' THEN
    v_seen := current_setting('lots.seen', true);
    IF v_seen IS NOT NULL AND position('|metrics:history|' IN '|' || v_seen || '|') > 0 THEN
      RETURN NULL;
    END IF;
    PERFORM set_config('lots.seen', coalesce(v_seen, '') || '|metrics:history', true);
    IF EXISTS (
      SELECT 1
      FROM public.app_live_signals s
      WHERE s.scope = 'metrics'
        AND s.cadastro_cliente_id IS NULL
        AND s.created_at > clock_timestamp() - interval '1 second'
    ) THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.app_live_signals (scope, audience)
    VALUES ('metrics', 'everyone');
    RETURN NULL;
  END IF;

  BEGIN
    v_cliente := NULLIF(rowj->>'cadastro_cliente_id', '')::bigint;
  EXCEPTION WHEN OTHERS THEN
    v_cliente := NULL;
  END;

  IF v_cliente IS NULL AND rowj ? 'cadastro_id' THEN
    BEGIN
      v_cliente := NULLIF(rowj->>'cadastro_id', '')::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_cliente := NULL;
    END;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'card_id' THEN
    SELECT c.cadastro_cliente_id INTO v_cliente
    FROM public.content_cards c
    WHERE c.id = NULLIF(rowj->>'card_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'plano_id' THEN
    SELECT p.cadastro_cliente_id INTO v_cliente
    FROM public.planos_estrategicos p
    WHERE p.id = NULLIF(rowj->>'plano_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'objetivo_id' THEN
    SELECT p.cadastro_cliente_id INTO v_cliente
    FROM public.plano_objetivos o
    JOIN public.planos_estrategicos p ON p.id = o.plano_id
    WHERE o.id = NULLIF(rowj->>'objetivo_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'estrategia_id' THEN
    SELECT p.cadastro_cliente_id INTO v_cliente
    FROM public.plano_estrategias e
    JOIN public.planos_estrategicos p ON p.id = e.plano_id
    WHERE e.id = NULLIF(rowj->>'estrategia_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'ig_media_id' THEN
    SELECT m.cadastro_cliente_id INTO v_cliente
    FROM public.ig_media m
    WHERE m.id = NULLIF(rowj->>'ig_media_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'connection_id' THEN
    SELECT c.cadastro_id INTO v_cliente
    FROM public.ph_connections c
    WHERE c.id = NULLIF(rowj->>'connection_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'cobranca_id' THEN
    SELECT c.cadastro_cliente_id INTO v_cliente
    FROM public.fin_cobrancas c
    WHERE c.id = NULLIF(rowj->>'cobranca_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND rowj ? 'nfse_id' THEN
    SELECT c.cadastro_cliente_id INTO v_cliente
    FROM public.fin_nfse n
    JOIN public.fin_cobrancas c ON c.id = n.cobranca_id
    WHERE n.id = NULLIF(rowj->>'nfse_id', '')::uuid;
  END IF;

  IF v_cliente IS NULL AND NULLIF(rowj->>'cliente', '') IS NOT NULL THEN
    v_cliente_nome := rowj->>'cliente';
    SELECT cc.id, cc.organization_id INTO v_cliente, v_org
    FROM public.cadastro_clientes cc
    WHERE lower(cc.nome_cliente) = lower(v_cliente_nome)
       OR EXISTS (
         SELECT 1
         FROM public.cliente_aliases al
         WHERE al.alias_metricas = v_cliente_nome
           AND lower(al.nome_canonico) = lower(cc.nome_cliente)
       )
    LIMIT 1;
  END IF;

  IF v_cliente IS NULL AND NULLIF(rowj->>'cliente_nome', '') IS NOT NULL THEN
    SELECT cc.id, cc.organization_id INTO v_cliente, v_org
    FROM public.cadastro_clientes cc
    WHERE cc.nome_cliente = rowj->>'cliente_nome'
    LIMIT 1;
  END IF;

  IF TG_TABLE_NAME = 'cadastro_clientes' AND v_cliente IS NULL THEN
    BEGIN
      v_cliente := NULLIF(rowj->>'id', '')::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_cliente := NULL;
    END;
  END IF;

  IF v_org IS NULL AND v_cliente IS NOT NULL THEN
    SELECT cc.organization_id INTO v_org
    FROM public.cadastro_clientes cc
    WHERE cc.id = v_cliente;
  END IF;

  IF v_org IS NULL AND rowj ? 'organization_id' THEN
    BEGIN
      v_org := NULLIF(rowj->>'organization_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_org := NULL;
    END;
  END IF;

  IF TG_TABLE_NAME IN (
    'app_notifications', 'client_access', 'organization_members',
    'organization_applications', 'access_accounts', 'user_roles'
  ) THEN
    BEGIN
      v_user := NULLIF(rowj->>'user_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user := NULL;
    END;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    BEGIN
      v_user := NULLIF(rowj->>'id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user := NULL;
    END;
  END IF;

  v_flag := v_scope || ':' || coalesce(v_cliente::text, '-') || ':' ||
    coalesce(v_user::text, '-') || ':' || coalesce(v_org::text, '-') || ':' || v_audience;
  v_seen := current_setting('lots.seen', true);
  IF v_seen IS NOT NULL AND position('|' || v_flag || '|' IN '|' || v_seen || '|') > 0 THEN
    RETURN NULL;
  END IF;
  PERFORM set_config('lots.seen', coalesce(v_seen, '') || '|' || v_flag, true);

  IF v_scope IN ('metrics', 'crm') AND EXISTS (
    SELECT 1
    FROM public.app_live_signals s
    WHERE s.scope = v_scope
      AND s.cadastro_cliente_id IS NOT DISTINCT FROM v_cliente
      AND s.created_at > clock_timestamp() - interval '1 second'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.app_live_signals (
    scope, audience, organization_id, cadastro_cliente_id, user_id
  )
  VALUES (v_scope, v_audience, v_org, v_cliente, v_user);

  IF random() < 0.02 THEN
    DELETE FROM public.app_live_signals
    WHERE id IN (
      SELECT s.id
      FROM public.app_live_signals s
      WHERE s.created_at < now() - interval '3 minutes'
      LIMIT 200
    );
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app_live_signal % %: %', TG_TABLE_NAME, TG_OP, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_app_live_signal() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'agency_tasks', 'lots_pendencias', 'lots_pendencia_log', 'lots_pendencia_pausa',
    'content_cards', 'content_card_events', 'content_card_attachments',
    'editorial_pillars', 'story_plan_rows', 'content_library_files', 'content_library_folders',
    'crm_people', 'crm_identities', 'crm_signals', 'crm_field_facts', 'crm_person_stats',
    'crm_person_notes', 'crm_ingest_tokens', 'crm_ingest_cursors', 'crm_collector_state',
    'relatorio_analises', 'relatorio_ocorrencias', 'cliente_diretrizes',
    'planos_estrategicos', 'plano_objetivos', 'plano_estrategias', 'plano_objetivo_estrategias',
    'plano_metric_refs', 'plano_hipoteses', 'plano_oportunidades', 'plano_decisoes',
    'plano_aprendizados', 'plano_roadmap_marcos', 'plano_acoes', 'plano_eventos',
    'plano_snapshots', 'plano_alinhamentos',
    'cadastro_clientes', 'cliente_servicos', 'client_access',
    'base_metricas_hub', 'base_metricas_make', 'ig_media', 'ig_media_metrics_history',
    'cliente_aliases',
    'ph_connections', 'ph_timeline_events', 'ph_sync_runs', 'ph_identities', 'ph_metricas_source',
    'app_notifications',
    'organization_applications', 'organization_members', 'organizations',
    'user_roles', 'access_accounts', 'profiles', 'system_metadata',
    'servicos',
    'agency_notes', 'agency_leads', 'agency_projects', 'agency_client_tags',
    'agency_timeline_events', 'agency_tags',
    'fin_cobrancas', 'fin_cobranca_itens', 'fin_recibos', 'fin_pagamentos',
    'fin_nfse', 'fin_nfse_eventos', 'fin_config', 'fin_dps_numeracao',
    'core_feature_flags'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS app_live_signal_trg ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER app_live_signal_trg
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW
       EXECUTE FUNCTION public.emit_app_live_signal()',
      t
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_live_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_live_signals;
  END IF;
END $$;
