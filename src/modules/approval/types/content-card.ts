/** Aggregate root — domínio oficial Content Workflow. Tabela: content_cards */

export const CONTENT_CARD_STATUSES = [
  "roteiro",
  "aguardando_aprovacao",
  "aguardando_material",
  "producao",
  "aguardando_aprovacao_final",
  "agendado",
  "publicado",
  "arquivado",
  /** Legado — fora do Kanban; aceitar leitura até limpar */
  "edicao",
  "aprovado",
] as const;

export type ContentCardStatus = (typeof CONTENT_CARD_STATUSES)[number];

export const KANBAN_ACTIVE_STATUSES: ContentCardStatus[] = [
  "roteiro",
  "aguardando_aprovacao",
  "aguardando_material",
  "producao",
  "aguardando_aprovacao_final",
  "agendado",
  "publicado",
];

export const CONTENT_FORMATOS = ["reels", "carrossel", "estatico"] as const;
export type ContentFormato = (typeof CONTENT_FORMATOS)[number];

export const FORMAT_LABEL: Record<ContentFormato, string> = {
  reels: "Reels",
  carrossel: "Carrossel",
  estatico: "Estático",
};

export const PUBLISH_STATUSES = [
  "none",
  "queued",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
] as const;

export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  auto?: boolean;
  required?: boolean;
};

export type ContentCard = {
  id: string;
  cadastro_cliente_id: number;
  cliente_nome: string;
  data_publicacao: string;
  hora_publicacao: string | null;
  titulo: string;
  legenda: string | null;
  copy_text: string | null;
  roteiro: string | null;
  direcao_arte: string | null;
  cta: string | null;
  plataforma: string;
  formato: string | null;
  linha_editorial: string | null;
  tema: string | null;
  capa_url: string | null;
  status: ContentCardStatus;
  checklist: ChecklistItem[];
  localizacao: string | null;
  tags: string[] | null;
  observacoes: string | null;
  responsavel_email: string | null;
  responsavel_user_id: string | null;
  pilar_id: string | null;
  estrategia_id: string | null;
  kanban_ordem: number;
  published_at: string | null;
  archived_at: string | null;
  publish_status: PublishStatus;
  scheduled_publish_at: string | null;
  publish_target: string | null;
  external_post_id: string | null;
  publish_container_id: string | null;
  publish_error: string | null;
  publish_attempted_at: string | null;
  ai_metadata: Record<string, unknown>;
  integration_metadata: Record<string, unknown>;
  legacy_post_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentCardInsert = Omit<
  ContentCard,
  "id" | "created_at" | "updated_at" | "published_at" | "archived_at"
> & {
  id?: string;
};

export type ContentCardUpdate = Partial<
  Omit<ContentCard, "id" | "created_at" | "updated_at" | "cadastro_cliente_id" | "cliente_nome">
>;
