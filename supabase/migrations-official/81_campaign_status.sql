-- Status atual da campanha (Ativa, Pausada, etc.) para os dashboards.
-- A métrica diária continua em base_metricas_hub. Isto é só o estado no Gerenciador.

CREATE TABLE IF NOT EXISTS public.ph_campaign_status (
  cliente text NOT NULL,
  plataforma text NOT NULL,
  campanha text NOT NULL,
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente, plataforma, campanha)
);

ALTER TABLE public.ph_campaign_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ph_campaign_status_select ON public.ph_campaign_status;
CREATE POLICY ph_campaign_status_select ON public.ph_campaign_status
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_owner(auth.uid()))
    OR public.metric_cliente_in_scope(cliente)
  );

GRANT SELECT ON public.ph_campaign_status TO authenticated;
