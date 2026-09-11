-- =========================================================
-- 53_app_notifications.sql
-- Notificações de aprovação fora do localStorage.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
  ON public.app_notifications (user_id, created_at DESC);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_notifications_select_own ON public.app_notifications;
CREATE POLICY app_notifications_select_own ON public.app_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS app_notifications_update_own ON public.app_notifications;
CREATE POLICY app_notifications_update_own ON public.app_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.app_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_notifications TO service_role;
