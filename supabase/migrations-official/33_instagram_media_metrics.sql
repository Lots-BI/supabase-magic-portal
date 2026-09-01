-- =========================================================
-- 33_instagram_media_metrics.sql (aditivo, idempotente)
-- Métricas por publicação Instagram (Feed, Reels, Carrossel, Stories).
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ig_media (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_cliente_id     bigint NOT NULL REFERENCES public.cadastro_clientes(id) ON DELETE CASCADE,
  ig_media_id             text NOT NULL,
  media_product_type      text NOT NULL,
  media_type              text NOT NULL,
  caption                 text,
  permalink               text,
  media_url               text,
  thumbnail_url           text,
  thumbnail_storage_path  text,
  published_at            timestamptz NOT NULL,
  metrics                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics_collected_at    timestamptz,
  content_card_id         uuid REFERENCES public.content_cards(id) ON DELETE SET NULL,
  last_synced_at          timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ig_media_client_ig_id_unique UNIQUE (cadastro_cliente_id, ig_media_id)
);

CREATE INDEX IF NOT EXISTS ig_media_cliente_published_idx
  ON public.ig_media (cadastro_cliente_id, published_at DESC);

CREATE INDEX IF NOT EXISTS ig_media_product_type_idx
  ON public.ig_media (cadastro_cliente_id, media_product_type);

CREATE TABLE IF NOT EXISTS public.ig_media_metrics_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_media_id  uuid NOT NULL REFERENCES public.ig_media(id) ON DELETE CASCADE,
  metric_key   text NOT NULL,
  value        numeric NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ig_media_metrics_history_media_idx
  ON public.ig_media_metrics_history (ig_media_id, collected_at DESC);

GRANT SELECT ON public.ig_media TO authenticated;
GRANT SELECT ON public.ig_media_metrics_history TO authenticated;
GRANT ALL ON public.ig_media TO service_role;
GRANT ALL ON public.ig_media_metrics_history TO service_role;

ALTER TABLE public.ig_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_media_metrics_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ig_media_admin_all ON public.ig_media;
CREATE POLICY ig_media_admin_all ON public.ig_media
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ig_media_client_select ON public.ig_media;
CREATE POLICY ig_media_client_select ON public.ig_media
  FOR SELECT TO authenticated
  USING (
    cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
  );

DROP POLICY IF EXISTS ig_media_history_admin_all ON public.ig_media_metrics_history;
CREATE POLICY ig_media_history_admin_all ON public.ig_media_metrics_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ig_media_history_client_select ON public.ig_media_metrics_history;
CREATE POLICY ig_media_history_client_select ON public.ig_media_metrics_history
  FOR SELECT TO authenticated
  USING (
    ig_media_id IN (
      SELECT id FROM public.ig_media
      WHERE cadastro_cliente_id IN (SELECT public.current_user_cadastro_cliente_ids())
    )
  );

CREATE OR REPLACE VIEW public.vw_ig_media_dashboard
WITH (security_invoker = on) AS
SELECT
  m.id,
  m.cadastro_cliente_id,
  m.ig_media_id,
  m.media_product_type,
  m.media_type,
  m.caption,
  m.permalink,
  m.media_url,
  m.thumbnail_url,
  m.thumbnail_storage_path,
  m.published_at,
  m.metrics,
  m.metrics_collected_at,
  m.last_synced_at,
  m.content_card_id,
  c.nome_cliente AS cliente_nome,
  c.slug AS cliente_slug
FROM public.ig_media m
JOIN public.cadastro_clientes c ON c.id = m.cadastro_cliente_id;

GRANT SELECT ON public.vw_ig_media_dashboard TO authenticated;

-- ---------- Storage bucket ig-media-thumbs ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ig-media-thumbs',
  'ig-media-thumbs',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ig_media_thumbs_admin_all ON storage.objects;
CREATE POLICY ig_media_thumbs_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ig-media-thumbs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'ig-media-thumbs' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS ig_media_thumbs_client_select ON storage.objects;
CREATE POLICY ig_media_thumbs_client_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ig-media-thumbs'
    AND (storage.foldername(name))[1]::bigint IN (SELECT public.current_user_cadastro_cliente_ids())
  );

DROP POLICY IF EXISTS ig_media_thumbs_service_role ON storage.objects;
CREATE POLICY ig_media_thumbs_service_role ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'ig-media-thumbs')
  WITH CHECK (bucket_id = 'ig-media-thumbs');
