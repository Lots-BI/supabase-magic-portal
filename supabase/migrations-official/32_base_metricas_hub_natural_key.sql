-- 32_base_metricas_hub_natural_key.sql
-- Idempotência do writer Hub: uma linha por (cliente, plataforma, metrica, data, campanha).
-- NÃO altera base_metricas_make.

-- Dedupa existentes: mantém o id mais recente por chave natural
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        cliente,
        plataforma,
        metrica,
        data,
        COALESCE(campanha, '')
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.base_metricas_hub
)
DELETE FROM public.base_metricas_hub h
USING ranked r
WHERE h.id = r.id
  AND r.rn > 1;

-- Índice único (campanha NULL tratada como '')
CREATE UNIQUE INDEX IF NOT EXISTS uq_base_metricas_hub_natural_key
  ON public.base_metricas_hub (
    cliente,
    plataforma,
    metrica,
    data,
    (COALESCE(campanha, ''))
  );
