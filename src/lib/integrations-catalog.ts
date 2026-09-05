// Central de Integrações — catálogo declarativo.
// Adicionar uma nova plataforma = uma migration aditiva (ADD COLUMN) + uma entrada aqui.
// Os cenários do Make leem essas mesmas colunas de cadastro_clientes.

export type IntegrationFieldDef = {
  /** Nome da coluna em cadastro_clientes. */
  col: string;
  /** Rótulo exibido no formulário. */
  label: string;
  /** Placeholder de exemplo. */
  placeholder?: string;
  /** Dica curta exibida abaixo do campo. */
  hint?: string;
  /** Campo principal usado para calcular o status do card (1 por plataforma). */
  primary?: boolean;
};

export type IntegrationDef = {
  key: string;
  label: string;
  /** Coluna boolean ou text em cadastro_clientes que sinaliza a plataforma ativa. */
  activeField: string;
  /** Cor de destaque opcional (classe utilitária). */
  accent?: string;
  fields: IntegrationFieldDef[];
};

export const INTEGRATIONS: readonly IntegrationDef[] = [
  {
    key: "google_ads",
    label: "Google Ads",
    activeField: "google_ads_ativo",
    fields: [
      {
        col: "google_ads_customer_id",
        label: "Customer ID",
        placeholder: "123-456-7890",
        hint: "ID numérico do anunciante (com ou sem hífens).",
        primary: true,
      },
    ],
  },
  {
    key: "meta",
    label: "Meta Ads",
    activeField: "meta_ativo",
    fields: [
      {
        col: "facebook_ad_account_id",
        label: "Facebook Ad Account ID",
        placeholder: "act_1234567890",
        hint: "Aceita prefixo act_ ou apenas dígitos.",
        primary: true,
      },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    activeField: "instagram_ativo",
    fields: [
      {
        col: "instagram_username",
        label: "Username (@)",
        placeholder: "marca.oficial",
        hint: "Handle público da conta (sem o @).",
      },
      {
        col: "instagram_page_id",
        label: "Instagram Page ID",
        placeholder: "17841400000000000",
        hint: "ID numérico da página/conta IG Business.",
        primary: true,
      },
    ],
  },
  {
    key: "ga4",
    label: "Google Analytics 4",
    activeField: "ga4_ativo",
    fields: [
      {
        col: "ga4_property_id",
        label: "Property ID",
        placeholder: "123456789",
        hint: "Apenas o número (sem 'properties/').",
        primary: true,
      },
    ],
  },
  {
    key: "gbp",
    label: "Google Business",
    activeField: "google_business_ativo",
    fields: [
      {
        col: "google_business_location_id",
        label: "Location ID",
        placeholder: "123456789012345",
        hint: "ID numérico do perfil no Google Business Profile.",
        primary: true,
      },
    ],
  },
  {
    key: "tiktok",
    label: "TikTok Ads",
    activeField: "tiktok_ativo",
    fields: [
      {
        col: "tiktok_ad_account_id",
        label: "Ad Account ID",
        placeholder: "7000000000000000000",
        hint: "ID numérico da conta de anúncios.",
        primary: true,
      },
    ],
  },
] as const;

/** Todas as colunas de integração (técnicas) que existem em cadastro_clientes. */
export const INTEGRATION_COLUMNS = INTEGRATIONS.flatMap((i) => i.fields.map((f) => f.col));

export type IntegrationStatus = "configured" | "partial" | "pre" | "off";

/** Calcula o status visual de uma plataforma. */
export function getIntegrationStatus(
  integration: IntegrationDef,
  values: Record<string, unknown>,
  active: boolean,
): IntegrationStatus {
  const primary = integration.fields.find((f) => f.primary) ?? integration.fields[0];
  const raw = primary ? values[primary.col] : null;
  const hasId = typeof raw === "string" ? raw.trim().length > 0 : !!raw;
  if (active && hasId) return "configured";
  if (active && !hasId) return "partial";
  if (!active && hasId) return "pre";
  return "off";
}

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, string> = {
  configured: "Configurado",
  partial: "Parcialmente configurado",
  pre: "Pré-configurado",
  off: "Não configurado",
};
