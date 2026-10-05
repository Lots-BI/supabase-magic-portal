-- =========================================================
-- 66_organization_rls.sql
-- Isola leitura e escrita pelo organization_id.
-- Não usa has_role(admin) em dado de cliente: esse papel continua
-- nos admins da Lots e, se a policy ainda o consultasse, eles veriam
-- o banco inteiro.
--
-- Bypass global: is_platform_owner (operador da plataforma), não admin.
-- ph_credentials: nenhuma policy para authenticated.
--
-- De propósito continuam em has_role(admin), porque não são dado de
-- uma agência cliente e a outra agência não recebe esse papel:
--   access_accounts, access_audit_log
--   fin_* (cobranca, NFS-e, recibo, pagamento, config, credencial)
--   storage.financeiro-documentos
--   prospecting_prospects, prospecting_runs
--   ph_debug_traces, ph_homologation_reports
--   core_audit_log, core_feature_flags (escrita)
--   servicos (escrita; SELECT já é true para authenticated)
--   agency_tags (escrita)
-- =========================================================

CREATE OR REPLACE FUNCTION public.can_manage_org(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = p_org
        AND om.user_id = auth.uid()
        AND om.role IN (
          'owner'::public.organization_member_role,
          'gestor'::public.organization_member_role
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_org_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN (
          'owner'::public.organization_member_role,
          'gestor'::public.organization_member_role,
          'social_media'::public.organization_member_role,
          'gestor_trafego'::public.organization_member_role
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_cadastro_cliente_ids()
RETURNS SETOF bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_owner(auth.uid()) THEN
    RETURN QUERY SELECT cc.id FROM public.cadastro_clientes cc;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT x.id
  FROM (
    SELECT cc.id
    FROM public.client_access ca
    JOIN public.cadastro_clientes cc
      ON cc.id = ca.cadastro_cliente_id
      OR (
        ca.cadastro_cliente_id IS NULL
        AND cc.nome_cliente = ca.cliente_nome
      )
    WHERE ca.user_id = auth.uid()
      AND cc.organization_id IN (SELECT public.current_user_organization_ids())
    UNION
    SELECT cc.id
    FROM public.cadastro_clientes cc
    WHERE public.is_org_staff()
      AND cc.organization_id IN (SELECT public.current_user_organization_ids())
  ) AS x
  WHERE x.id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_clientes()
RETURNS TABLE (cliente_nome text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_owner(auth.uid()) THEN
    RETURN QUERY
    SELECT cc.nome_cliente
    FROM public.cadastro_clientes cc
    WHERE cc.ativo IS DISTINCT FROM false
      AND cc.nome_cliente IS NOT NULL;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT n.nome
  FROM (
    SELECT ca.cliente_nome AS nome
    FROM public.client_access ca
    JOIN public.cadastro_clientes cc
      ON cc.id = ca.cadastro_cliente_id
      OR (
        ca.cadastro_cliente_id IS NULL
        AND cc.nome_cliente = ca.cliente_nome
      )
    WHERE ca.user_id = auth.uid()
      AND cc.organization_id IN (SELECT public.current_user_organization_ids())
    UNION
    SELECT cc.nome_cliente
    FROM public.cadastro_clientes cc
    WHERE public.is_org_staff()
      AND cc.organization_id IN (SELECT public.current_user_organization_ids())
      AND cc.ativo IS DISTINCT FROM false
      AND cc.nome_cliente IS NOT NULL
  ) AS n
  WHERE n.nome IS NOT NULL;
END;
$$;

-- Staff da org, ou operador da plataforma. Não inclui o cliente final.
CREATE OR REPLACE FUNCTION public.staff_cadastro_in_scope(p_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_id IS NOT NULL AND (
    public.is_platform_owner(auth.uid())
    OR (
      public.is_org_staff()
      AND EXISTS (
        SELECT 1
        FROM public.cadastro_clientes cc
        WHERE cc.id = p_id
          AND cc.organization_id IN (SELECT public.current_user_organization_ids())
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.org_operator_can_write_cadastro(p_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_id IS NOT NULL AND public.is_org_operator() AND public.staff_cadastro_in_scope(p_id);
$$;

CREATE OR REPLACE FUNCTION public.metric_cliente_in_scope(p_cliente text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.current_user_clientes() AS c
    LEFT JOIN public.cliente_aliases AS al ON al.alias_metricas = p_cliente
    WHERE c.cliente_nome IS NOT DISTINCT FROM COALESCE(al.nome_canonico, p_cliente)
  );
$$;

CREATE OR REPLACE FUNCTION public.connection_in_scope(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_id IS NOT NULL AND (
    public.is_platform_owner(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.ph_connections c
      WHERE c.id = p_id
        AND public.staff_cadastro_in_scope(c.cadastro_id)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.card_in_scope(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.content_cards card
    WHERE card.id = p_id
      AND (
        public.staff_cadastro_in_scope(card.cadastro_cliente_id)
        OR card.cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
        OR card.cliente_nome IN (SELECT c.cliente_nome FROM public.current_user_clientes() AS c)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.plano_in_scope(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.planos_estrategicos p
    WHERE p.id = p_id
      AND public.staff_cadastro_in_scope(p.cadastro_cliente_id)
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_org(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_operator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_cadastro_in_scope(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_operator_can_write_cadastro(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.metric_cliente_in_scope(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connection_in_scope(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.card_in_scope(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.plano_in_scope(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_operator() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_cadastro_cliente_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_clientes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.staff_cadastro_in_scope(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_operator_can_write_cadastro(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.metric_cliente_in_scope(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.connection_in_scope(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.card_in_scope(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plano_in_scope(uuid) TO authenticated, service_role;

-- A 65 só concedeu SELECT. Escrita continua limitada pelas policies abaixo.
GRANT INSERT, UPDATE, DELETE ON TABLE public.organizations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.organization_members TO authenticated;

-- Escrita de org e membros, prometida na 65.
DROP POLICY IF EXISTS organizations_insert ON public.organizations;
CREATE POLICY organizations_insert ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_owner(auth.uid()));

DROP POLICY IF EXISTS organizations_update ON public.organizations;
CREATE POLICY organizations_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_platform_owner(auth.uid()))
  WITH CHECK (public.is_platform_owner(auth.uid()));

DROP POLICY IF EXISTS organization_members_insert ON public.organization_members;
CREATE POLICY organization_members_insert ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS organization_members_update ON public.organization_members;
CREATE POLICY organization_members_update ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS organization_members_delete ON public.organization_members;
CREATE POLICY organization_members_delete ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.can_manage_org(organization_id));

-- ---------- cadastro e acesso ----------
DROP POLICY IF EXISTS "cadastro_clientes_admin_all" ON public.cadastro_clientes;
DROP POLICY IF EXISTS cadastro_clientes_staff_select ON public.cadastro_clientes;
CREATE POLICY cadastro_clientes_staff_select ON public.cadastro_clientes
  FOR SELECT TO authenticated
  USING (
    public.is_platform_owner(auth.uid())
    OR (
      public.is_org_staff()
      AND organization_id IN (SELECT public.current_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS cadastro_clientes_manage_insert ON public.cadastro_clientes;
CREATE POLICY cadastro_clientes_manage_insert ON public.cadastro_clientes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS cadastro_clientes_manage_update ON public.cadastro_clientes;
CREATE POLICY cadastro_clientes_manage_update ON public.cadastro_clientes
  FOR UPDATE TO authenticated
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS cadastro_clientes_manage_delete ON public.cadastro_clientes;
CREATE POLICY cadastro_clientes_manage_delete ON public.cadastro_clientes
  FOR DELETE TO authenticated
  USING (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS "client_access_admin_all" ON public.client_access;
DROP POLICY IF EXISTS client_access_staff_select ON public.client_access;
CREATE POLICY client_access_staff_select ON public.client_access
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));

DROP POLICY IF EXISTS client_access_manage_insert ON public.client_access;
CREATE POLICY client_access_manage_insert ON public.client_access
  FOR INSERT TO authenticated
  WITH CHECK (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )));

DROP POLICY IF EXISTS client_access_manage_update ON public.client_access;
CREATE POLICY client_access_manage_update ON public.client_access
  FOR UPDATE TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )))
  WITH CHECK (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )));

DROP POLICY IF EXISTS client_access_manage_delete ON public.client_access;
CREATE POLICY client_access_manage_delete ON public.client_access
  FOR DELETE TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )));

-- Alias só acompanha nome canônico visível. Escrita: quem gere a org desse nome.
DROP POLICY IF EXISTS "cliente_aliases_admin_all" ON public.cliente_aliases;
DROP POLICY IF EXISTS cliente_aliases_select ON public.cliente_aliases;
CREATE POLICY cliente_aliases_select ON public.cliente_aliases
  FOR SELECT TO authenticated
  USING (
    public.is_platform_owner(auth.uid())
    OR nome_canonico IN (SELECT c.cliente_nome FROM public.current_user_clientes() AS c)
  );

DROP POLICY IF EXISTS cliente_aliases_write ON public.cliente_aliases;
CREATE POLICY cliente_aliases_write ON public.cliente_aliases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cadastro_clientes cc
      WHERE cc.nome_cliente = cliente_aliases.nome_canonico
        AND public.can_manage_org(cc.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cadastro_clientes cc
      WHERE cc.nome_cliente = cliente_aliases.nome_canonico
        AND public.can_manage_org(cc.organization_id)
    )
  );

-- ---------- métricas: uma policy, sem has_role ----------
DROP POLICY IF EXISTS base_metricas_hub_admin_select ON public.base_metricas_hub;
DROP POLICY IF EXISTS base_metricas_hub_client_select ON public.base_metricas_hub;
DROP POLICY IF EXISTS base_metricas_hub_select ON public.base_metricas_hub;
CREATE POLICY base_metricas_hub_select ON public.base_metricas_hub
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_owner(auth.uid()))
    OR public.metric_cliente_in_scope(cliente)
  );

DROP POLICY IF EXISTS base_metricas_make_select_authenticated ON public.base_metricas_make;
CREATE POLICY base_metricas_make_select_authenticated ON public.base_metricas_make
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_owner(auth.uid()))
    OR public.metric_cliente_in_scope(cliente)
  );

-- ---------- token: some da API authenticated ----------
DROP POLICY IF EXISTS ph_credentials_admin_all ON public.ph_credentials;

-- ---------- conexões ----------
DROP POLICY IF EXISTS ph_connections_admin_all ON public.ph_connections;
DROP POLICY IF EXISTS ph_connections_select ON public.ph_connections;
CREATE POLICY ph_connections_select ON public.ph_connections
  FOR SELECT TO authenticated
  USING (public.connection_in_scope(id) OR public.staff_cadastro_in_scope(cadastro_id));

DROP POLICY IF EXISTS ph_connections_insert ON public.ph_connections;
CREATE POLICY ph_connections_insert ON public.ph_connections
  FOR INSERT TO authenticated
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_id));

DROP POLICY IF EXISTS ph_connections_update ON public.ph_connections;
CREATE POLICY ph_connections_update ON public.ph_connections
  FOR UPDATE TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_id));

DROP POLICY IF EXISTS ph_connections_delete ON public.ph_connections;
CREATE POLICY ph_connections_delete ON public.ph_connections
  FOR DELETE TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_id));

DROP POLICY IF EXISTS ph_identities_admin_all ON public.ph_identities;
DROP POLICY IF EXISTS ph_identities_select ON public.ph_identities;
CREATE POLICY ph_identities_select ON public.ph_identities
  FOR SELECT TO authenticated
  USING (public.connection_in_scope(connection_id));

DROP POLICY IF EXISTS ph_identities_write ON public.ph_identities;
CREATE POLICY ph_identities_write ON public.ph_identities
  FOR ALL TO authenticated
  USING (public.connection_in_scope(connection_id) AND public.is_org_operator())
  WITH CHECK (public.connection_in_scope(connection_id) AND public.is_org_operator());

DROP POLICY IF EXISTS ph_sync_runs_admin_all ON public.ph_sync_runs;
DROP POLICY IF EXISTS ph_sync_runs_select ON public.ph_sync_runs;
CREATE POLICY ph_sync_runs_select ON public.ph_sync_runs
  FOR SELECT TO authenticated
  USING (public.connection_in_scope(connection_id));

DROP POLICY IF EXISTS ph_oauth_states_admin_all ON public.ph_oauth_states;
DROP POLICY IF EXISTS ph_oauth_states_all ON public.ph_oauth_states;
CREATE POLICY ph_oauth_states_all ON public.ph_oauth_states
  FOR ALL TO authenticated
  USING (public.connection_in_scope(connection_id) AND public.is_org_operator())
  WITH CHECK (public.connection_in_scope(connection_id) AND public.is_org_operator());

DROP POLICY IF EXISTS ph_timeline_admin_all ON public.ph_timeline_events;
DROP POLICY IF EXISTS ph_timeline_select ON public.ph_timeline_events;
CREATE POLICY ph_timeline_select ON public.ph_timeline_events
  FOR SELECT TO authenticated
  USING (
    public.connection_in_scope(connection_id)
    OR public.staff_cadastro_in_scope(cadastro_id)
  );

DROP POLICY IF EXISTS ph_comparison_reports_admin_all ON public.ph_comparison_reports;
DROP POLICY IF EXISTS ph_comparison_reports_select ON public.ph_comparison_reports;
CREATE POLICY ph_comparison_reports_select ON public.ph_comparison_reports
  FOR SELECT TO authenticated
  USING (public.connection_in_scope(connection_id));

-- ---------- conteúdo ----------
DROP POLICY IF EXISTS content_cards_admin_all ON public.content_cards;
DROP POLICY IF EXISTS content_cards_staff_select ON public.content_cards;
CREATE POLICY content_cards_staff_select ON public.content_cards
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));

DROP POLICY IF EXISTS content_cards_staff_write ON public.content_cards;
CREATE POLICY content_cards_staff_write ON public.content_cards
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS content_card_attachments_admin_all ON public.content_card_attachments;
DROP POLICY IF EXISTS content_card_attachments_select ON public.content_card_attachments;
CREATE POLICY content_card_attachments_select ON public.content_card_attachments
  FOR SELECT TO authenticated
  USING (public.card_in_scope(card_id));

DROP POLICY IF EXISTS content_card_attachments_write ON public.content_card_attachments;
CREATE POLICY content_card_attachments_write ON public.content_card_attachments
  FOR ALL TO authenticated
  USING (public.card_in_scope(card_id) AND public.is_org_operator())
  WITH CHECK (public.card_in_scope(card_id) AND public.is_org_operator());

DROP POLICY IF EXISTS content_card_events_admin_all ON public.content_card_events;
DROP POLICY IF EXISTS content_card_events_select ON public.content_card_events;
CREATE POLICY content_card_events_select ON public.content_card_events
  FOR SELECT TO authenticated
  USING (public.card_in_scope(card_id));

DROP POLICY IF EXISTS content_card_events_write ON public.content_card_events;
CREATE POLICY content_card_events_write ON public.content_card_events
  FOR ALL TO authenticated
  USING (public.card_in_scope(card_id) AND public.is_org_operator())
  WITH CHECK (public.card_in_scope(card_id) AND public.is_org_operator());

DROP POLICY IF EXISTS editorial_pillars_admin_all ON public.editorial_pillars;
DROP POLICY IF EXISTS editorial_pillars_select ON public.editorial_pillars;
CREATE POLICY editorial_pillars_select ON public.editorial_pillars
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));

DROP POLICY IF EXISTS editorial_pillars_write ON public.editorial_pillars;
CREATE POLICY editorial_pillars_write ON public.editorial_pillars
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS story_plan_rows_admin_all ON public.story_plan_rows;
DROP POLICY IF EXISTS story_plan_rows_select ON public.story_plan_rows;
CREATE POLICY story_plan_rows_select ON public.story_plan_rows
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));

DROP POLICY IF EXISTS story_plan_rows_write ON public.story_plan_rows;
CREATE POLICY story_plan_rows_write ON public.story_plan_rows
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS ig_media_admin_all ON public.ig_media;
DROP POLICY IF EXISTS ig_media_select ON public.ig_media;
CREATE POLICY ig_media_select ON public.ig_media
  FOR SELECT TO authenticated
  USING (
    public.staff_cadastro_in_scope(cadastro_cliente_id)
    OR cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
  );

DROP POLICY IF EXISTS ig_media_history_admin_all ON public.ig_media_metrics_history;
DROP POLICY IF EXISTS ig_media_history_select ON public.ig_media_metrics_history;
CREATE POLICY ig_media_history_select ON public.ig_media_metrics_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ig_media m
      WHERE m.id = ig_media_metrics_history.ig_media_id
        AND (
          public.staff_cadastro_in_scope(m.cadastro_cliente_id)
          OR m.cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
        )
    )
  );

-- ---------- CRM, agência operacional, plano, diretrizes ----------
DROP POLICY IF EXISTS cliente_diretrizes_admin_all ON public.cliente_diretrizes;
DROP POLICY IF EXISTS cliente_diretrizes_select ON public.cliente_diretrizes;
CREATE POLICY cliente_diretrizes_select ON public.cliente_diretrizes
  FOR SELECT TO authenticated
  USING (
    public.staff_cadastro_in_scope(cadastro_cliente_id)
    OR cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
  );

DROP POLICY IF EXISTS cliente_diretrizes_write ON public.cliente_diretrizes;
CREATE POLICY cliente_diretrizes_write ON public.cliente_diretrizes
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS cliente_servicos_admin_all ON public.cliente_servicos;
DROP POLICY IF EXISTS cliente_servicos_select ON public.cliente_servicos;
CREATE POLICY cliente_servicos_select ON public.cliente_servicos
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));

DROP POLICY IF EXISTS cliente_servicos_write ON public.cliente_servicos;
CREATE POLICY cliente_servicos_write ON public.cliente_servicos
  FOR ALL TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )))
  WITH CHECK (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )));

-- agency_tags: catálogo compartilhado. Staff lê. Escrita continua no admin global.
DROP POLICY IF EXISTS agency_tags_staff_select ON public.agency_tags;
CREATE POLICY agency_tags_staff_select ON public.agency_tags
  FOR SELECT TO authenticated
  USING (public.is_org_staff() OR public.is_platform_owner(auth.uid()));

DROP POLICY IF EXISTS agency_client_tags_admin_all ON public.agency_client_tags;
DROP POLICY IF EXISTS agency_client_tags_select ON public.agency_client_tags;
CREATE POLICY agency_client_tags_select ON public.agency_client_tags
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS agency_client_tags_write ON public.agency_client_tags;
CREATE POLICY agency_client_tags_write ON public.agency_client_tags
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS agency_leads_admin_all ON public.agency_leads;

DROP POLICY IF EXISTS agency_notes_admin_all ON public.agency_notes;
DROP POLICY IF EXISTS agency_notes_select ON public.agency_notes;
CREATE POLICY agency_notes_select ON public.agency_notes
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS agency_notes_write ON public.agency_notes;
CREATE POLICY agency_notes_write ON public.agency_notes
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS agency_projects_admin_all ON public.agency_projects;
DROP POLICY IF EXISTS agency_projects_select ON public.agency_projects;
CREATE POLICY agency_projects_select ON public.agency_projects
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS agency_projects_write ON public.agency_projects;
CREATE POLICY agency_projects_write ON public.agency_projects
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS agency_tasks_admin_all ON public.agency_tasks;
DROP POLICY IF EXISTS agency_tasks_select ON public.agency_tasks;
CREATE POLICY agency_tasks_select ON public.agency_tasks
  FOR SELECT TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS agency_tasks_write ON public.agency_tasks;
CREATE POLICY agency_tasks_write ON public.agency_tasks
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS agency_timeline_admin_select ON public.agency_timeline_events;
DROP POLICY IF EXISTS agency_timeline_admin_insert ON public.agency_timeline_events;

-- Leads e timeline sem cliente ainda são visíveis só ao operador da plataforma.
-- Isso vaza lead sem cadastro entre agências. A 66 não cria organization_id
-- nessas linhas legadas; enquanto cadastro_cliente_id for nulo, só o
-- operador da plataforma lê e grava.
DROP POLICY IF EXISTS agency_leads_select ON public.agency_leads;
CREATE POLICY agency_leads_select ON public.agency_leads
  FOR SELECT TO authenticated
  USING (
    (cadastro_cliente_id IS NULL AND public.is_platform_owner(auth.uid()))
    OR public.staff_cadastro_in_scope(cadastro_cliente_id)
  );
DROP POLICY IF EXISTS agency_leads_write ON public.agency_leads;
CREATE POLICY agency_leads_write ON public.agency_leads
  FOR ALL TO authenticated
  USING (
    (cadastro_cliente_id IS NULL AND public.is_platform_owner(auth.uid()))
    OR public.org_operator_can_write_cadastro(cadastro_cliente_id)
  )
  WITH CHECK (
    (cadastro_cliente_id IS NULL AND public.is_platform_owner(auth.uid()))
    OR public.org_operator_can_write_cadastro(cadastro_cliente_id)
  );

DROP POLICY IF EXISTS agency_timeline_select ON public.agency_timeline_events;
CREATE POLICY agency_timeline_select ON public.agency_timeline_events
  FOR SELECT TO authenticated
  USING (
    (cadastro_cliente_id IS NULL AND public.is_platform_owner(auth.uid()))
    OR public.staff_cadastro_in_scope(cadastro_cliente_id)
  );
DROP POLICY IF EXISTS agency_timeline_insert ON public.agency_timeline_events;
CREATE POLICY agency_timeline_insert ON public.agency_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (
    (cadastro_cliente_id IS NULL AND public.is_platform_owner(auth.uid()))
    OR public.org_operator_can_write_cadastro(cadastro_cliente_id)
  );

-- CRM
DROP POLICY IF EXISTS crm_people_admin_all ON public.crm_people;
DROP POLICY IF EXISTS crm_people_select ON public.crm_people;
CREATE POLICY crm_people_select ON public.crm_people
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_people_write ON public.crm_people;
CREATE POLICY crm_people_write ON public.crm_people
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_identities_admin_all ON public.crm_identities;
DROP POLICY IF EXISTS crm_identities_select ON public.crm_identities;
CREATE POLICY crm_identities_select ON public.crm_identities
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_identities_write ON public.crm_identities;
CREATE POLICY crm_identities_write ON public.crm_identities
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_signals_admin_all ON public.crm_signals;
DROP POLICY IF EXISTS crm_signals_select ON public.crm_signals;
CREATE POLICY crm_signals_select ON public.crm_signals
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_signals_write ON public.crm_signals;
CREATE POLICY crm_signals_write ON public.crm_signals
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_person_notes_admin_all ON public.crm_person_notes;
DROP POLICY IF EXISTS crm_person_notes_select ON public.crm_person_notes;
CREATE POLICY crm_person_notes_select ON public.crm_person_notes
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_person_notes_write ON public.crm_person_notes;
CREATE POLICY crm_person_notes_write ON public.crm_person_notes
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_person_stats_admin_all ON public.crm_person_stats;
DROP POLICY IF EXISTS crm_person_stats_select ON public.crm_person_stats;
CREATE POLICY crm_person_stats_select ON public.crm_person_stats
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_person_stats_write ON public.crm_person_stats;
CREATE POLICY crm_person_stats_write ON public.crm_person_stats
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_field_facts_admin_all ON public.crm_field_facts;
DROP POLICY IF EXISTS crm_field_facts_select ON public.crm_field_facts;
CREATE POLICY crm_field_facts_select ON public.crm_field_facts
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_field_facts_write ON public.crm_field_facts;
CREATE POLICY crm_field_facts_write ON public.crm_field_facts
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_collector_state_admin_all ON public.crm_collector_state;
DROP POLICY IF EXISTS crm_collector_state_select ON public.crm_collector_state;
CREATE POLICY crm_collector_state_select ON public.crm_collector_state
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_collector_state_write ON public.crm_collector_state;
CREATE POLICY crm_collector_state_write ON public.crm_collector_state
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_webhook_receipts_admin_all ON public.crm_webhook_receipts;
DROP POLICY IF EXISTS crm_webhook_receipts_select ON public.crm_webhook_receipts;
CREATE POLICY crm_webhook_receipts_select ON public.crm_webhook_receipts
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_webhook_receipts_write ON public.crm_webhook_receipts;
CREATE POLICY crm_webhook_receipts_write ON public.crm_webhook_receipts
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_ingest_cursors_admin_all ON public.crm_ingest_cursors;
DROP POLICY IF EXISTS crm_ingest_cursors_select ON public.crm_ingest_cursors;
CREATE POLICY crm_ingest_cursors_select ON public.crm_ingest_cursors
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_ingest_cursors_write ON public.crm_ingest_cursors;
CREATE POLICY crm_ingest_cursors_write ON public.crm_ingest_cursors
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS crm_ingest_tokens_admin_all ON public.crm_ingest_tokens;
DROP POLICY IF EXISTS crm_ingest_tokens_select ON public.crm_ingest_tokens;
CREATE POLICY crm_ingest_tokens_select ON public.crm_ingest_tokens
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS crm_ingest_tokens_write ON public.crm_ingest_tokens;
CREATE POLICY crm_ingest_tokens_write ON public.crm_ingest_tokens
  FOR ALL TO authenticated
  USING (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )))
  WITH CHECK (public.staff_cadastro_in_scope(cadastro_cliente_id) AND public.can_manage_org((
    SELECT cc.organization_id FROM public.cadastro_clientes cc WHERE cc.id = cadastro_cliente_id
  )));

-- Plano estratégico
DROP POLICY IF EXISTS planos_estrategicos_admin_all ON public.planos_estrategicos;
DROP POLICY IF EXISTS planos_estrategicos_select ON public.planos_estrategicos;
CREATE POLICY planos_estrategicos_select ON public.planos_estrategicos
  FOR SELECT TO authenticated USING (public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS planos_estrategicos_write ON public.planos_estrategicos;
CREATE POLICY planos_estrategicos_write ON public.planos_estrategicos
  FOR ALL TO authenticated
  USING (public.org_operator_can_write_cadastro(cadastro_cliente_id))
  WITH CHECK (public.org_operator_can_write_cadastro(cadastro_cliente_id));

DROP POLICY IF EXISTS plano_alinhamentos_admin_all ON public.plano_alinhamentos;
DROP POLICY IF EXISTS plano_alinhamentos_select ON public.plano_alinhamentos;
CREATE POLICY plano_alinhamentos_select ON public.plano_alinhamentos
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id) OR public.staff_cadastro_in_scope(cadastro_cliente_id));
DROP POLICY IF EXISTS plano_alinhamentos_write ON public.plano_alinhamentos;
CREATE POLICY plano_alinhamentos_write ON public.plano_alinhamentos
  FOR ALL TO authenticated
  USING (public.is_org_operator() AND (public.plano_in_scope(plano_id) OR public.staff_cadastro_in_scope(cadastro_cliente_id)))
  WITH CHECK (public.is_org_operator() AND (public.plano_in_scope(plano_id) OR public.staff_cadastro_in_scope(cadastro_cliente_id)));

DROP POLICY IF EXISTS plano_acoes_admin_all ON public.plano_acoes;
DROP POLICY IF EXISTS plano_acoes_select ON public.plano_acoes;
CREATE POLICY plano_acoes_select ON public.plano_acoes
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_acoes_all ON public.plano_acoes;
CREATE POLICY plano_acoes_all ON public.plano_acoes
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_aprendizados_admin_all ON public.plano_aprendizados;
DROP POLICY IF EXISTS plano_aprendizados_select ON public.plano_aprendizados;
CREATE POLICY plano_aprendizados_select ON public.plano_aprendizados
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_aprendizados_all ON public.plano_aprendizados;
CREATE POLICY plano_aprendizados_all ON public.plano_aprendizados
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_decisoes_admin_all ON public.plano_decisoes;
DROP POLICY IF EXISTS plano_decisoes_select ON public.plano_decisoes;
CREATE POLICY plano_decisoes_select ON public.plano_decisoes
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_decisoes_all ON public.plano_decisoes;
CREATE POLICY plano_decisoes_all ON public.plano_decisoes
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_estrategias_admin_all ON public.plano_estrategias;
DROP POLICY IF EXISTS plano_estrategias_select ON public.plano_estrategias;
CREATE POLICY plano_estrategias_select ON public.plano_estrategias
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_estrategias_all ON public.plano_estrategias;
CREATE POLICY plano_estrategias_all ON public.plano_estrategias
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_eventos_admin_all ON public.plano_eventos;
DROP POLICY IF EXISTS plano_eventos_select ON public.plano_eventos;
CREATE POLICY plano_eventos_select ON public.plano_eventos
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_eventos_all ON public.plano_eventos;
CREATE POLICY plano_eventos_all ON public.plano_eventos
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_hipoteses_admin_all ON public.plano_hipoteses;
DROP POLICY IF EXISTS plano_hipoteses_select ON public.plano_hipoteses;
CREATE POLICY plano_hipoteses_select ON public.plano_hipoteses
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_hipoteses_all ON public.plano_hipoteses;
CREATE POLICY plano_hipoteses_all ON public.plano_hipoteses
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_metric_refs_admin_all ON public.plano_metric_refs;
DROP POLICY IF EXISTS plano_metric_refs_select ON public.plano_metric_refs;
CREATE POLICY plano_metric_refs_select ON public.plano_metric_refs
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_metric_refs_all ON public.plano_metric_refs;
CREATE POLICY plano_metric_refs_all ON public.plano_metric_refs
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_objetivos_admin_all ON public.plano_objetivos;
DROP POLICY IF EXISTS plano_objetivos_select ON public.plano_objetivos;
CREATE POLICY plano_objetivos_select ON public.plano_objetivos
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_objetivos_all ON public.plano_objetivos;
CREATE POLICY plano_objetivos_all ON public.plano_objetivos
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_oportunidades_admin_all ON public.plano_oportunidades;
DROP POLICY IF EXISTS plano_oportunidades_select ON public.plano_oportunidades;
CREATE POLICY plano_oportunidades_select ON public.plano_oportunidades
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_oportunidades_all ON public.plano_oportunidades;
CREATE POLICY plano_oportunidades_all ON public.plano_oportunidades
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_roadmap_marcos_admin_all ON public.plano_roadmap_marcos;
DROP POLICY IF EXISTS plano_roadmap_marcos_select ON public.plano_roadmap_marcos;
CREATE POLICY plano_roadmap_marcos_select ON public.plano_roadmap_marcos
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_roadmap_marcos_all ON public.plano_roadmap_marcos;
CREATE POLICY plano_roadmap_marcos_all ON public.plano_roadmap_marcos
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_snapshots_admin_all ON public.plano_snapshots;
DROP POLICY IF EXISTS plano_snapshots_select ON public.plano_snapshots;
CREATE POLICY plano_snapshots_select ON public.plano_snapshots
  FOR SELECT TO authenticated USING (public.plano_in_scope(plano_id));
DROP POLICY IF EXISTS plano_snapshots_all ON public.plano_snapshots;
CREATE POLICY plano_snapshots_all ON public.plano_snapshots
  FOR ALL TO authenticated
  USING (public.plano_in_scope(plano_id) AND public.is_org_operator())
  WITH CHECK (public.plano_in_scope(plano_id) AND public.is_org_operator());

DROP POLICY IF EXISTS plano_objetivo_estrategias_admin_all ON public.plano_objetivo_estrategias;
DROP POLICY IF EXISTS plano_objetivo_estrategias_select ON public.plano_objetivo_estrategias;
CREATE POLICY plano_objetivo_estrategias_select ON public.plano_objetivo_estrategias
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plano_objetivos o
      WHERE o.id = plano_objetivo_estrategias.objetivo_id
        AND public.plano_in_scope(o.plano_id)
    )
  );
DROP POLICY IF EXISTS plano_objetivo_estrategias_all ON public.plano_objetivo_estrategias;
CREATE POLICY plano_objetivo_estrategias_all ON public.plano_objetivo_estrategias
  FOR ALL TO authenticated
  USING (
    public.is_org_operator() AND EXISTS (
      SELECT 1 FROM public.plano_objetivos o
      WHERE o.id = plano_objetivo_estrategias.objetivo_id
        AND public.plano_in_scope(o.plano_id)
    )
  )
  WITH CHECK (
    public.is_org_operator() AND EXISTS (
      SELECT 1 FROM public.plano_objetivos o
      WHERE o.id = plano_objetivo_estrategias.objetivo_id
        AND public.plano_in_scope(o.plano_id)
    )
  );

-- Financeiro, checkout e NFS-e ficam nas policies atuais (has_role admin). Nao recriar nem dropar fin_* aqui.

-- Catálogo de flags: staff lê, escrita segue admin global (policy antiga de ALL
-- é trocada para não deixar o SELECT novo conviver com ALL).
DROP POLICY IF EXISTS core_feature_flags_admin_all ON public.core_feature_flags;
DROP POLICY IF EXISTS core_feature_flags_select ON public.core_feature_flags;
CREATE POLICY core_feature_flags_select ON public.core_feature_flags
  FOR SELECT TO authenticated
  USING (
    public.is_org_staff()
    OR public.is_platform_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
DROP POLICY IF EXISTS core_feature_flags_write ON public.core_feature_flags;
CREATE POLICY core_feature_flags_write ON public.core_feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS system_metadata_admin_select ON public.system_metadata;
CREATE POLICY system_metadata_admin_select ON public.system_metadata
  FOR SELECT TO authenticated
  USING (
    public.is_org_staff()
    OR public.is_platform_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.safe_int8(p text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p ~ '^[0-9]+$' THEN p::bigint ELSE NULL END;
$$;

REVOKE ALL ON FUNCTION public.safe_int8(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_int8(text) TO authenticated, service_role;

-- Storage. Pastas legadas de editorial (uuid na raiz) ficam com o admin da Lots.
-- O cast só acontece dentro do CASE, para um nome inválido não derrubar a query.

DROP POLICY IF EXISTS editorial_media_admin_all ON storage.objects;
CREATE POLICY editorial_media_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'editorial-media'
    AND (
      public.is_platform_owner(auth.uid())
      OR (
        public.is_org_operator()
        AND split_part(name, '/', 1) = 'content-cards'
        AND public.card_in_scope(
          CASE
            WHEN split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN split_part(name, '/', 2)::uuid
            ELSE NULL
          END
        )
      )
      OR (
        public.has_role(auth.uid(), 'admin')
        AND split_part(name, '/', 1) <> 'content-cards'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'editorial-media'
    AND (
      public.is_platform_owner(auth.uid())
      OR (
        public.is_org_operator()
        AND split_part(name, '/', 1) = 'content-cards'
        AND public.card_in_scope(
          CASE
            WHEN split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN split_part(name, '/', 2)::uuid
            ELSE NULL
          END
        )
      )
    )
  );

DROP POLICY IF EXISTS diretrizes_marca_admin_all ON storage.objects;
CREATE POLICY diretrizes_marca_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'diretrizes-marca'
    AND (
      public.is_platform_owner(auth.uid())
      OR (
        public.is_org_operator()
        AND public.staff_cadastro_in_scope(public.safe_int8((storage.foldername(name))[1]))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'diretrizes-marca'
    AND (
      public.is_platform_owner(auth.uid())
      OR (
        public.is_org_operator()
        AND public.staff_cadastro_in_scope(public.safe_int8((storage.foldername(name))[1]))
      )
    )
  );

DROP POLICY IF EXISTS ig_media_thumbs_admin_all ON storage.objects;
CREATE POLICY ig_media_thumbs_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ig-media-thumbs'
    AND (
      public.is_platform_owner(auth.uid())
      OR public.staff_cadastro_in_scope(public.safe_int8((storage.foldername(name))[1]))
    )
  )
  WITH CHECK (
    bucket_id = 'ig-media-thumbs'
    AND (
      public.is_platform_owner(auth.uid())
      OR (
        public.is_org_operator()
        AND public.staff_cadastro_in_scope(public.safe_int8((storage.foldername(name))[1]))
      )
    )
  );
