-- =========================================================
-- 62_crm_inbox.sql
-- Inbox: dono, merge auditável, recibos de webhook Meta.
-- Não altera Conteúdos nem Hub de métricas.
-- =========================================================

ALTER TABLE public.crm_people
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.crm_people
  ADD COLUMN IF NOT EXISTS merged_into_id uuid REFERENCES public.crm_people (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_people_owner_idx
  ON public.crm_people (cadastro_cliente_id, owner_user_id)
  WHERE ignored_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_people_merged_idx
  ON public.crm_people (merged_into_id)
  WHERE merged_into_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_webhook_receipts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id   bigint REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  provider              text NOT NULL,
  external_id           text NOT NULL,
  field                 text,
  received_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

GRANT ALL ON public.crm_webhook_receipts TO service_role;

ALTER TABLE public.crm_webhook_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_webhook_receipts_admin_all ON public.crm_webhook_receipts;
CREATE POLICY crm_webhook_receipts_admin_all ON public.crm_webhook_receipts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.vw_crm_people_list;

CREATE VIEW public.vw_crm_people_list
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
  p.owner_user_id,
  p.merged_into_id,
  pr.nome AS owner_nome,
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
  ) AS ig_username,
  (
    SELECT sig.kind::text
    FROM public.crm_signals sig
    WHERE sig.person_id = p.id
    ORDER BY sig.occurred_at DESC
    LIMIT 1
  ) AS last_kind
FROM public.crm_people p
JOIN public.cadastro_clientes c ON c.id = p.cadastro_cliente_id
LEFT JOIN public.crm_person_stats s ON s.person_id = p.id
LEFT JOIN public.profiles pr ON pr.id = p.owner_user_id;

GRANT SELECT ON public.vw_crm_people_list TO authenticated;
GRANT SELECT ON public.vw_crm_people_list TO service_role;
