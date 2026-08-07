/** Lots BI — identidade visual e metadados da plataforma. */
export const BRAND_NAME = "Lots BI";
export const BRAND_NAME_SHORT = "Lots BI";
export const BRAND_TAGLINE = "Business Intelligence para marketing digital";
export const BRAND_DESCRIPTION =
  "Lots BI — plataforma de inteligência de negócios para consolidar métricas, clientes e operações de marketing.";

const SUPABASE_MEDIA_BASE =
  "https://ywvhoctcmibjitvwkkhb.supabase.co/storage/v1/object/public/Midias";

export const BRAND_COLORS = {
  purple: "#A855F7",
  blue: "#60A5FA",
  /** Cor do texto "Lots" no lockup (extraída do asset oficial). */
  lotsText: "#2C2E3B",
  slate: "#334155",
  background: "#000000",
} as const;

export type BrandColorSwatch = {
  name: string;
  hex: string;
  role: string;
  cssVar?: string;
};

/** Paleta oficial com hex documentado (âncoras do design system). */
export const BRAND_COLOR_SWATCHES: readonly BrandColorSwatch[] = [
  {
    name: "Primary (Purple)",
    hex: BRAND_COLORS.purple,
    role: "Cor principal — CTAs, foco, gráficos primários",
    cssVar: "--primary-500",
  },
  {
    name: "Secondary (Blue)",
    hex: BRAND_COLORS.blue,
    role: "Cor secundária — acentos, gráficos, gradiente",
    cssVar: "--secondary-400",
  },
  {
    name: "Lots Text",
    hex: BRAND_COLORS.lotsText,
    role: "Texto “Lots” no lockup (tema claro)",
    cssVar: "--lots-wordmark-text",
  },
  {
    name: "Slate",
    hex: BRAND_COLORS.slate,
    role: "Texto de apoio e UI neutra",
  },
  {
    name: "Background",
    hex: BRAND_COLORS.background,
    role: "Preto de marca — OG, fundos escuros",
  },
  {
    name: "Mint",
    hex: "#E2EEEB",
    role: "Neutro quente — superfícies e fundos",
    cssVar: "--mint-100",
  },
  {
    name: "Lilac",
    hex: "#DFCBE4",
    role: "Neutro lilás — acentos orgânicos",
    cssVar: "--lilac-100",
  },
  {
    name: "Success",
    hex: "#22C55E",
    role: "Semântica positiva — gráficos e status",
    cssVar: "--success",
  },
  {
    name: "Neutral",
    hex: "#A1A1AA",
    role: "Séries neutras em gráficos",
  },
] as const;

export const BRAND_TYPOGRAPHY = {
  display: "Urbanist Variable",
  sans: "Epilogue Variable",
  mono: "JetBrains Mono",
} as const;

export type BrandAssetItem = {
  id: keyof typeof BRAND_ASSETS;
  label: string;
  description: string;
};

export const BRAND_ASSET_ITEMS: readonly BrandAssetItem[] = [
  { id: "logoFull", label: "Lockup completo", description: "Símbolo + Lots + BI (horizontal)" },
  { id: "icon", label: "Ícone / pétala", description: "Favicon e avatar compacto (SVG)" },
  { id: "logoBi", label: "Letras BI", description: "BI com gradiente de marca" },
  { id: "logoLots", label: "Palavra Lots", description: "Referência tipográfica" },
  { id: "favicon", label: "Favicon", description: "PNG para abas e atalhos" },
  { id: "ogImage", label: "Open Graph", description: "Preview em redes e compartilhamento" },
] as const;

/** Mídias oficiais hospedadas no Supabase Storage (bucket `Midias`). */
export const BRAND_ASSETS = {
  /** Lockup horizontal completo (símbolo + Lots + BI). */
  logoFull: `${SUPABASE_MEDIA_BASE}/1.png`,
  /** Símbolo / pétala (favicon, ícone compacto). */
  icon: `${SUPABASE_MEDIA_BASE}/Logo%20SVG/2.svg`,
  /** Letras BI com gradiente. */
  logoBi: `${SUPABASE_MEDIA_BASE}/3.png`,
  /** Palavra Lots (referência; no UI usamos texto tipográfico). */
  logoLots: `${SUPABASE_MEDIA_BASE}/4.png`,
  favicon: `${SUPABASE_MEDIA_BASE}/2.png`,
  ogImage: `${SUPABASE_MEDIA_BASE}/1.png`,
} as const;

/** Título de aba: `section` · Lots BI */
export function brandTitle(section: string): string {
  return `${section} · ${BRAND_NAME}`;
}

/** Título de aba admin: `section` · Admin · Lots BI */
export function adminTitle(section: string): string {
  return `${section} · Admin · ${BRAND_NAME}`;
}
