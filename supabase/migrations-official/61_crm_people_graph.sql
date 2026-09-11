-- =========================================================
-- 61_crm_people_graph.sql
-- CRM de audiência: pessoas identificáveis, sinais, jornada, cobertura.
-- Não altera Conteúdos, Hub de métricas nem agency_leads.
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.crm_signal_kind AS ENUM (
    'comment', 'reply', 'dm', 'story_reply', 'lead_form',
    'whatsapp', 'review', 'mention', 'brand_reply'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_signal_place AS ENUM (
    'feed', 'reels', 'story', 'ads', 'whatsapp', 'gbp', 'youtube', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_identity_kind AS ENUM (
    'igsid', 'ig_username', 'email', 'phone', 'whatsapp',
    'messenger_psid', 'leadgen', 'gbp_reviewer', 'yt_channel'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_field_key AS ENUM (
    'email', 'phone', 'address', 'full_name'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_churn_state AS ENUM (
    'novo', 'recorrente', 'em_risco', 'dormindo', 'reativado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_collector_status AS ENUM (
    'live', 'scope_missing', 'planned', 'impossible'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- crm_people ----------

CREATE TABLE IF NOT EXISTS public.crm_people (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  display_name          text NOT NULL,
  is_vip                boolean NOT NULL DEFAULT false,
  ignored_at            timestamptz,
  first_signal_at       timestamptz,
  last_signal_at        timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_people_cliente_last_idx
  ON public.crm_people (cadastro_cliente_id, last_signal_at DESC)
  WHERE ignored_at IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_crm_people_set_updated_at') THEN
    CREATE TRIGGER tg_crm_people_set_updated_at
      BEFORE UPDATE ON public.crm_people
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

-- ---------- crm_identities ----------

CREATE TABLE IF NOT EXISTS public.crm_identities (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             uuid NOT NULL REFERENCES public.crm_people(id) ON DELETE CASCADE,
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  kind                  public.crm_identity_kind NOT NULL,
  value                 text NOT NULL,
  confidence            smallint NOT NULL DEFAULT 100 CHECK (confidence BETWEEN 0 AND 100),
  source                text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cadastro_cliente_id, kind, value)
);

CREATE INDEX IF NOT EXISTS crm_identities_person_idx
  ON public.crm_identities (person_id);

-- ---------- crm_signals ----------

CREATE TABLE IF NOT EXISTS public.crm_signals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             uuid NOT NULL REFERENCES public.crm_people(id) ON DELETE CASCADE,
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  kind                  public.crm_signal_kind NOT NULL,
  place                 public.crm_signal_place NOT NULL DEFAULT 'unknown',
  source                text NOT NULL,
  external_id           text NOT NULL,
  body                  text,
  occurred_at           timestamptz NOT NULL,
  ig_media_id           uuid REFERENCES public.ig_media(id) ON DELETE SET NULL,
  content_card_id       uuid REFERENCES public.content_cards(id) ON DELETE SET NULL,
  campaign_key          text,
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cadastro_cliente_id, source, external_id)
);

CREATE INDEX IF NOT EXISTS crm_signals_person_occurred_idx
  ON public.crm_signals (person_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS crm_signals_media_idx
  ON public.crm_signals (ig_media_id)
  WHERE ig_media_id IS NOT NULL;

-- ---------- crm_field_facts ----------

CREATE TABLE IF NOT EXISTS public.crm_field_facts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             uuid NOT NULL REFERENCES public.crm_people(id) ON DELETE CASCADE,
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  field                 public.crm_field_key NOT NULL,
  value                 text NOT NULL,
  source                text NOT NULL,
  collected_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, field, source)
);

-- ---------- crm_person_stats ----------

CREATE TABLE IF NOT EXISTS public.crm_person_stats (
  person_id             uuid PRIMARY KEY REFERENCES public.crm_people(id) ON DELETE CASCADE,
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  signal_count          int NOT NULL DEFAULT 0,
  kind_counts           jsonb NOT NULL DEFAULT '{}'::jsonb,
  place_counts          jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_distinct        int NOT NULL DEFAULT 0,
  card_distinct         int NOT NULL DEFAULT 0,
  pillar_affinity       jsonb NOT NULL DEFAULT '{}'::jsonb,
  recency_days          int NOT NULL DEFAULT 0,
  tenure_days           int NOT NULL DEFAULT 0,
  active_weeks          int NOT NULL DEFAULT 0,
  streak_weeks          int NOT NULL DEFAULT 0,
  churn_state           public.crm_churn_state NOT NULL DEFAULT 'novo',
  intent_score          smallint NOT NULL DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 100),
  pii_completeness      numeric(3,2) NOT NULL DEFAULT 0,
  heat_score            numeric NOT NULL DEFAULT 0,
  first_signal_at       timestamptz,
  last_signal_at        timestamptz,
  computed_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_person_stats_cliente_heat_idx
  ON public.crm_person_stats (cadastro_cliente_id, heat_score DESC);

-- ---------- crm_person_notes (staff only) ----------

CREATE TABLE IF NOT EXISTS public.crm_person_notes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             uuid NOT NULL REFERENCES public.crm_people(id) ON DELETE CASCADE,
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  body                  text NOT NULL,
  author_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_person_notes_person_idx
  ON public.crm_person_notes (person_id, created_at DESC);

-- ---------- ingest / cobertura ----------

CREATE TABLE IF NOT EXISTS public.crm_ingest_cursors (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id         uuid REFERENCES public.ph_connections(id) ON DELETE CASCADE,
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  ig_media_id           text,
  cursor_value          text,
  last_error            text,
  comments_fetched      int NOT NULL DEFAULT 0,
  last_ran_at           timestamptz,
  UNIQUE (connection_id, ig_media_id)
);

CREATE TABLE IF NOT EXISTS public.crm_collector_state (
  cadastro_cliente_id   bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  collector_key         text NOT NULL,
  status                public.crm_collector_status NOT NULL,
  detail                text,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cadastro_cliente_id, collector_key)
);

-- ---------- grants ----------

GRANT SELECT ON public.crm_people TO authenticated;
GRANT SELECT ON public.crm_identities TO authenticated;
GRANT SELECT ON public.crm_signals TO authenticated;
GRANT SELECT ON public.crm_field_facts TO authenticated;
GRANT SELECT ON public.crm_person_stats TO authenticated;
GRANT SELECT ON public.crm_collector_state TO authenticated;
GRANT ALL ON public.crm_people TO service_role;
GRANT ALL ON public.crm_identities TO service_role;
GRANT ALL ON public.crm_signals TO service_role;
GRANT ALL ON public.crm_field_facts TO service_role;
GRANT ALL ON public.crm_person_stats TO service_role;
GRANT ALL ON public.crm_person_notes TO service_role;
GRANT ALL ON public.crm_ingest_cursors TO service_role;
GRANT ALL ON public.crm_collector_state TO service_role;

-- Notes: authenticated admin via RLS (no generic GRANT SELECT to all clients)
GRANT SELECT, INSERT ON public.crm_person_notes TO authenticated;
GRANT SELECT ON public.crm_ingest_cursors TO authenticated;

ALTER TABLE public.crm_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_field_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_person_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_person_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ingest_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_collector_state ENABLE ROW LEVEL SECURITY;

-- Admin ALL
DROP POLICY IF EXISTS crm_people_admin_all ON public.crm_people;
CREATE POLICY crm_people_admin_all ON public.crm_people
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS crm_identities_admin_all ON public.crm_identities;
CREATE POLICY crm_identities_admin_all ON public.crm_identities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS crm_signals_admin_all ON public.crm_signals;
CREATE POLICY crm_signals_admin_all ON public.crm_signals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS crm_field_facts_admin_all ON public.crm_field_facts;
CREATE POLICY crm_field_facts_admin_all ON public.crm_field_facts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS crm_person_stats_admin_all ON public.crm_person_stats;
CREATE POLICY crm_person_stats_admin_all ON public.crm_person_stats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS crm_person_notes_admin_all ON public.crm_person_notes;
CREATE POLICY crm_person_notes_admin_all ON public.crm_person_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS crm_ingest_cursors_admin_all ON public.crm_ingest_cursors;
CREATE POLICY crm_ingest_cursors_admin_all ON public.crm_ingest_cursors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS crm_collector_state_admin_all ON public.crm_collector_state;
CREATE POLICY crm_collector_state_admin_all ON public.crm_collector_state
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Client SELECT (not notes)
DROP POLICY IF EXISTS crm_people_client_select ON public.crm_people;
CREATE POLICY crm_people_client_select ON public.crm_people
  FOR SELECT TO authenticated
  USING (cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids()));

DROP POLICY IF EXISTS crm_identities_client_select ON public.crm_identities;
CREATE POLICY crm_identities_client_select ON public.crm_identities
  FOR SELECT TO authenticated
  USING (cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids()));

DROP POLICY IF EXISTS crm_signals_client_select ON public.crm_signals;
CREATE POLICY crm_signals_client_select ON public.crm_signals
  FOR SELECT TO authenticated
  USING (cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids()));

DROP POLICY IF EXISTS crm_field_facts_client_select ON public.crm_field_facts;
CREATE POLICY crm_field_facts_client_select ON public.crm_field_facts
  FOR SELECT TO authenticated
  USING (cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids()));

DROP POLICY IF EXISTS crm_person_stats_client_select ON public.crm_person_stats;
CREATE POLICY crm_person_stats_client_select ON public.crm_person_stats
  FOR SELECT TO authenticated
  USING (cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids()));

DROP POLICY IF EXISTS crm_collector_state_client_select ON public.crm_collector_state;
CREATE POLICY crm_collector_state_client_select ON public.crm_collector_state
  FOR SELECT TO authenticated
  USING (cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids()));

DROP POLICY IF EXISTS crm_ingest_cursors_client_select ON public.crm_ingest_cursors;
CREATE POLICY crm_ingest_cursors_client_select ON public.crm_ingest_cursors
  FOR SELECT TO authenticated
  USING (cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids()));

CREATE OR REPLACE VIEW public.vw_crm_people_list
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.cadastro_cliente_id,
  c.nome_cliente AS cliente_nome,
  c.slug AS cliente_slug,
  p.display_name,
  p.is_vip,
  p.ignored_at,
  p.first_signal_at,
  p.last_signal_at,
  s.signal_count,
  s.kind_counts,
  s.place_counts,
  s.media_distinct,
  s.card_distinct,
  s.pillar_affinity,
  s.recency_days,
  s.tenure_days,
  s.active_weeks,
  s.streak_weeks,
  s.churn_state,
  s.intent_score,
  s.pii_completeness,
  s.heat_score,
  (
    SELECT i.value
    FROM public.crm_identities i
    WHERE i.person_id = p.id AND i.kind = 'ig_username'
    ORDER BY i.created_at
    LIMIT 1
  ) AS ig_username
FROM public.crm_people p
JOIN public.cadastro_clientes c ON c.id = p.cadastro_cliente_id
LEFT JOIN public.crm_person_stats s ON s.person_id = p.id;

GRANT SELECT ON public.vw_crm_people_list TO authenticated;
GRANT SELECT ON public.vw_crm_people_list TO service_role;
