/** Coleta de mídia/posts (entity-upsert) — permanece separada do perfil. */
export const INSTAGRAM_ORGANIC_METRICS_CAPABILITY = "instagram_organic:metrics:collect" as const;

/** Coleta de insights de perfil (conta/dia — metrics-timeseries), paridade Make. */
export const INSTAGRAM_ORGANIC_PROFILE_CAPABILITY = "instagram_organic:profile:collect" as const;

/** Comentários identificáveis para o CRM de audiência. */
export const INSTAGRAM_ORGANIC_CRM_COMMENTS_CAPABILITY =
  "instagram_organic:crm:comments" as const;

export const INSTAGRAM_ORGANIC_CAPABILITIES = [
  INSTAGRAM_ORGANIC_METRICS_CAPABILITY,
  INSTAGRAM_ORGANIC_PROFILE_CAPABILITY,
  INSTAGRAM_ORGANIC_CRM_COMMENTS_CAPABILITY,
] as const;
