import type { ContentCard, ChecklistItem } from "../types/content-card";
import type { ContentCardEvent } from "../types/content-card-event";
import type { ContentCardAttachment } from "../types/content-card-attachment";
import type { EditorialPillar } from "../types/editorial-pillar";
import type { StoryPlanRow } from "../types/story-plan-row";

export type ContentCardRow = Record<string, unknown>;
export type ContentCardEventRow = Record<string, unknown>;
export type ContentCardAttachmentRow = Record<string, unknown>;
export type EditorialPillarRow = Record<string, unknown>;
export type StoryPlanRowRow = Record<string, unknown>;

function asChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value as ChecklistItem[];
}

export function mapContentCardRow(row: ContentCardRow): ContentCard {
  return {
    id: String(row.id),
    cadastro_cliente_id: Number(row.cadastro_cliente_id),
    cliente_nome: String(row.cliente_nome),
    data_publicacao: String(row.data_publicacao),
    hora_publicacao: row.hora_publicacao != null ? String(row.hora_publicacao) : null,
    titulo: String(row.titulo),
    legenda: row.legenda != null ? String(row.legenda) : null,
    copy_text: row.copy_text != null ? String(row.copy_text) : null,
    roteiro: row.roteiro != null ? String(row.roteiro) : null,
    direcao_arte: row.direcao_arte != null ? String(row.direcao_arte) : null,
    cta: row.cta != null ? String(row.cta) : null,
    plataforma: String(row.plataforma ?? "instagram"),
    formato: row.formato != null ? String(row.formato) : null,
    linha_editorial: row.linha_editorial != null ? String(row.linha_editorial) : null,
    tema: row.tema != null ? String(row.tema) : null,
    capa_url: row.capa_url != null ? String(row.capa_url) : null,
    status: row.status as ContentCard["status"],
    checklist: asChecklist(row.checklist),
    localizacao: row.localizacao != null ? String(row.localizacao) : null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : null,
    observacoes: row.observacoes != null ? String(row.observacoes) : null,
    responsavel_email: row.responsavel_email != null ? String(row.responsavel_email) : null,
    responsavel_user_id: row.responsavel_user_id != null ? String(row.responsavel_user_id) : null,
    pilar_id: row.pilar_id != null ? String(row.pilar_id) : null,
    estrategia_id: row.estrategia_id != null ? String(row.estrategia_id) : null,
    kanban_ordem: Number(row.kanban_ordem ?? 0),
    published_at: row.published_at != null ? String(row.published_at) : null,
    archived_at: row.archived_at != null ? String(row.archived_at) : null,
    publish_status: (row.publish_status as ContentCard["publish_status"]) ?? "none",
    scheduled_publish_at:
      row.scheduled_publish_at != null ? String(row.scheduled_publish_at) : null,
    publish_target: row.publish_target != null ? String(row.publish_target) : null,
    external_post_id: row.external_post_id != null ? String(row.external_post_id) : null,
    publish_container_id:
      row.publish_container_id != null ? String(row.publish_container_id) : null,
    publish_error: row.publish_error != null ? String(row.publish_error) : null,
    publish_attempted_at:
      row.publish_attempted_at != null ? String(row.publish_attempted_at) : null,
    ai_metadata: (row.ai_metadata as Record<string, unknown>) ?? {},
    integration_metadata: (row.integration_metadata as Record<string, unknown>) ?? {},
    legacy_post_id: row.legacy_post_id != null ? String(row.legacy_post_id) : null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapContentCardEventRow(row: ContentCardEventRow): ContentCardEvent {
  return {
    id: String(row.id),
    card_id: String(row.card_id),
    actor_id: row.actor_id != null ? String(row.actor_id) : null,
    actor_email: row.actor_email != null ? String(row.actor_email) : null,
    event_type: row.event_type as ContentCardEvent["event_type"],
    payload: (row.payload as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
  };
}

export function mapContentCardAttachmentRow(row: ContentCardAttachmentRow): ContentCardAttachment {
  return {
    id: String(row.id),
    card_id: String(row.card_id),
    storage_path: String(row.storage_path),
    mime_type: String(row.mime_type),
    kind: row.kind as ContentCardAttachment["kind"],
    media_role: row.media_role as ContentCardAttachment["media_role"],
    file_name: row.file_name != null ? String(row.file_name) : null,
    file_size: row.file_size != null ? Number(row.file_size) : null,
    ordem: Number(row.ordem ?? 0),
    width: row.width != null ? Number(row.width) : null,
    height: row.height != null ? Number(row.height) : null,
    duration_seconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    poster_path: row.poster_path != null ? String(row.poster_path) : null,
    legacy_media_id: row.legacy_media_id != null ? String(row.legacy_media_id) : null,
    created_at: String(row.created_at),
  };
}

export function mapEditorialPillarRow(row: EditorialPillarRow): EditorialPillar {
  return {
    id: String(row.id),
    cadastro_cliente_id: Number(row.cadastro_cliente_id),
    titulo: String(row.titulo),
    objetivo: row.objetivo != null ? String(row.objetivo) : null,
    explicacao: row.explicacao != null ? String(row.explicacao) : null,
    cor: String(row.cor ?? "#6366f1"),
    ordem: Number(row.ordem ?? 0),
    ativo: Boolean(row.ativo ?? true),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapStoryPlanRowRow(row: StoryPlanRowRow): StoryPlanRow {
  return {
    id: String(row.id),
    cadastro_cliente_id: Number(row.cadastro_cliente_id),
    card_id: row.card_id != null ? String(row.card_id) : null,
    semana_inicio: String(row.semana_inicio),
    dia_semana: Number(row.dia_semana),
    periodo: row.periodo != null ? String(row.periodo) : null,
    titulo: row.titulo != null ? String(row.titulo) : null,
    observacoes: row.observacoes != null ? String(row.observacoes) : null,
    checklist: asChecklist(row.checklist),
    ordem: Number(row.ordem ?? 0),
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
