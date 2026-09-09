import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import type { ContentCard, ContentCardInsert, ContentCardStatus } from "../types/content-card";
import type { ApprovalRole } from "../types/approval-role";
import { assertCardAction } from "../permissions/resolve-card-action";
import { assertValidTransition } from "../workflow/status-machine";
import { eventTypeForTransition } from "../services/event-type-for-transition";
import type { ContentCardUpdate } from "../types/content-card";
import { buildProductionChecklist } from "../services/build-production-checklist";
import {
  requiredChecklistPending,
  syncAutoChecklist,
} from "../services/build-next-production-step";
import { FEATURE_META_CONTENT_PUBLISH } from "@/lib/feature-flags";
import { combineBrazilSchedule, shouldRefreshSchedule } from "../services/brazil-schedule";

export type LifecycleActor = {
  userId: string;
  email: string | null;
  role: ApprovalRole;
};

function assertAction(
  role: ApprovalRole,
  action: Parameters<typeof assertCardAction>[0]["action"],
) {
  assertCardAction({ role, action });
}

async function appendEvent(
  supabase: SupabaseClient,
  cardId: string,
  actor: LifecycleActor,
  eventType: Parameters<typeof contentCardEventRepository.append>[1]["event_type"],
  payload: Record<string, unknown> = {},
) {
  return contentCardEventRepository.append(supabase, {
    card_id: cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: eventType,
    payload,
  });
}

export async function createContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: ContentCardInsert,
): Promise<ContentCard> {
  assertAction(actor.role, "create");
  const formato = input.formato ?? "estatico";
  const checklist =
    input.checklist && input.checklist.length > 0
      ? input.checklist
      : buildProductionChecklist(formato);
  const card = await contentCardRepository.insert(supabase, {
    ...input,
    created_by: actor.userId,
    cliente_nome: input.cliente_nome,
    plataforma: input.plataforma ?? "instagram",
    formato,
    linha_editorial: input.linha_editorial ?? null,
    tema: input.tema ?? null,
    status: input.status ?? "roteiro",
    kanban_ordem: input.kanban_ordem ?? 0,
    checklist,
    legenda: input.legenda ?? null,
    copy_text: input.copy_text ?? null,
    roteiro: input.roteiro ?? null,
    direcao_arte: input.direcao_arte ?? null,
    cta: input.cta ?? null,
    capa_url: input.capa_url ?? null,
    localizacao: input.localizacao ?? null,
    tags: input.tags ?? null,
    observacoes: input.observacoes ?? null,
    responsavel_email: input.responsavel_email ?? null,
    responsavel_user_id: input.responsavel_user_id ?? null,
    pilar_id: input.pilar_id ?? null,
    estrategia_id: input.estrategia_id ?? null,
    publish_status: input.publish_status ?? "none",
    scheduled_publish_at:
      input.scheduled_publish_at ??
      combineBrazilSchedule(input.data_publicacao, input.hora_publicacao),
    publish_target: input.publish_target ?? input.plataforma ?? "instagram",
    external_post_id: input.external_post_id ?? null,
    publish_container_id: input.publish_container_id ?? null,
    publish_error: input.publish_error ?? null,
    publish_attempted_at: input.publish_attempted_at ?? null,
    ai_metadata: input.ai_metadata ?? {},
    integration_metadata: input.integration_metadata ?? {},
    legacy_post_id: input.legacy_post_id ?? null,
  });
  await appendEvent(supabase, card.id, actor, "created", { titulo: card.titulo });
  return card;
}

export async function updateContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
  patch: ContentCardUpdate,
): Promise<ContentCard> {
  if (patch.roteiro !== undefined && Object.keys(patch).length === 1) {
    assertAction(actor.role, "edit_roteiro");
  } else {
    assertAction(actor.role, "edit");
  }
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Card não encontrado");
  const dateOrTimeChanged =
    patch.data_publicacao !== undefined || patch.hora_publicacao !== undefined;
  if (
    dateOrTimeChanged &&
    patch.scheduled_publish_at === undefined &&
    shouldRefreshSchedule(existing.publish_status)
  ) {
    patch = {
      ...patch,
      scheduled_publish_at: combineBrazilSchedule(
        patch.data_publicacao ?? existing.data_publicacao,
        patch.hora_publicacao !== undefined ? patch.hora_publicacao : existing.hora_publicacao,
      ),
    };
  }
  const card = await contentCardRepository.update(supabase, cardId, patch);
  await appendEvent(supabase, cardId, actor, "updated", {
    fields: Object.keys(patch),
    status_de: existing.status,
    status_para: card.status,
  });
  return card;
}

export async function moveContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { id: string; status: ContentCardStatus; kanban_ordem: number },
): Promise<ContentCard> {
  assertAction(actor.role, "move");
  const existing = await contentCardRepository.findById(supabase, input.id);
  if (!existing) throw new Error("Card não encontrado");

  assertValidTransition(existing.status, input.status);

  const patch: ContentCardUpdate = {
    status: input.status,
    kanban_ordem: input.kanban_ordem,
  };
  if (input.status === "publicado" && !existing.published_at) {
    patch.published_at = new Date().toISOString();
  }
  if (input.status === "arquivado" && !existing.archived_at) {
    patch.archived_at = new Date().toISOString();
  }

  const card = await contentCardRepository.update(supabase, input.id, patch);
  const eventType = eventTypeForTransition(existing.status, input.status);
  await appendEvent(supabase, input.id, actor, eventType, {
    status_de: existing.status,
    status_para: input.status,
    kanban_ordem: input.kanban_ordem,
  });
  return card;
}

export async function markMaterialsDownloaded(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<ContentCard> {
  assertAction(actor.role, "move");
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Card não encontrado");
  if (existing.status !== "aguardando_material") {
    throw new Error("Só é possível ir para produção depois de receber o material do cliente.");
  }
  return moveContentCard(supabase, actor, {
    id: cardId,
    status: "producao",
    kanban_ordem: existing.kanban_ordem,
  });
}

export async function requestFinalApproval(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
  options?: {
    scheduledAt?: string | null;
    dataPublicacao?: string;
    horaPublicacao?: string | null;
  },
): Promise<ContentCard> {
  assertAction(actor.role, "move");
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Card não encontrado");
  if (existing.status !== "producao" && existing.status !== "alteracoes_design") {
    throw new Error("Só é possível pedir aprovação da publicação a partir de Em produção.");
  }
  const attachments = await contentCardAttachmentRepository.listByCardId(supabase, cardId);
  const hasFinal = attachments.some((a) => a.media_role === "final");
  if (!hasFinal) {
    throw new Error("Anexe a publicação finalizada antes de enviar ao cliente.");
  }
  const dataPublicacao = options?.dataPublicacao ?? existing.data_publicacao;
  const horaPublicacao =
    options?.horaPublicacao !== undefined ? options.horaPublicacao : existing.hora_publicacao;
  const when = options?.scheduledAt || combineBrazilSchedule(dataPublicacao, horaPublicacao);
  await contentCardRepository.update(supabase, cardId, {
    data_publicacao: dataPublicacao,
    hora_publicacao: horaPublicacao,
    scheduled_publish_at: when,
    publish_target: "instagram",
    publish_status: "none",
    publish_error: null,
  });
  return moveContentCard(supabase, actor, {
    id: cardId,
    status: "aguardando_aprovacao_final",
    kanban_ordem: existing.kanban_ordem,
  });
}

export async function schedulePublish(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; scheduled_at: string },
): Promise<ContentCard> {
  assertAction(actor.role, "schedule_publish");
  const existing = await contentCardRepository.findById(supabase, input.card_id);
  if (!existing) throw new Error("Card não encontrado");
  if (existing.status === "aguardando_aprovacao_final") {
    assertValidTransition(existing.status, "agendado");
  }
  const card = await contentCardRepository.update(supabase, input.card_id, {
    status: "agendado",
    scheduled_publish_at: input.scheduled_at,
    publish_status: "scheduled",
    publish_target: "instagram",
    publish_error: null,
  });
  await appendEvent(supabase, input.card_id, actor, "publish_queued", {
    scheduled_at: input.scheduled_at,
    meta_publish: FEATURE_META_CONTENT_PUBLISH,
  });
  return card;
}

export async function markPublishNowQueued(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<ContentCard> {
  assertAction(actor.role, "schedule_publish");
  const card = await contentCardRepository.update(supabase, cardId, {
    status: "agendado",
    scheduled_publish_at: new Date().toISOString(),
    publish_status: "queued",
    publish_target: "instagram",
    publish_error: null,
  });
  await appendEvent(supabase, cardId, actor, "publish_queued", { immediate: true });
  return card;
}

export async function archiveContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<ContentCard> {
  assertAction(actor.role, "archive");
  const existing = await contentCardRepository.findById(supabase, cardId);
  if (!existing) throw new Error("Card não encontrado");
  return moveContentCard(supabase, actor, {
    id: cardId,
    status: "arquivado",
    kanban_ordem: existing.kanban_ordem,
  });
}

export async function duplicateContentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  cardId: string,
): Promise<ContentCard> {
  assertAction(actor.role, "create");
  const source = await contentCardRepository.findById(supabase, cardId);
  if (!source) throw new Error("Card não encontrado");

  const copy = await createContentCard(supabase, actor, {
    cadastro_cliente_id: source.cadastro_cliente_id,
    cliente_nome: source.cliente_nome,
    data_publicacao: source.data_publicacao,
    hora_publicacao: source.hora_publicacao,
    titulo: `${source.titulo} (cópia)`,
    legenda: source.legenda,
    copy_text: source.copy_text,
    roteiro: source.roteiro,
    direcao_arte: source.direcao_arte,
    cta: source.cta,
    plataforma: source.plataforma,
    formato: source.formato,
    linha_editorial: source.linha_editorial,
    tema: source.tema,
    capa_url: source.capa_url,
    status: "roteiro",
    checklist: buildProductionChecklist(source.formato),
    localizacao: source.localizacao,
    tags: source.tags,
    observacoes: source.observacoes,
    responsavel_email: source.responsavel_email,
    responsavel_user_id: source.responsavel_user_id,
    pilar_id: source.pilar_id,
    estrategia_id: source.estrategia_id,
    kanban_ordem: source.kanban_ordem + 1,
    publish_status: "none",
    scheduled_publish_at: null,
    publish_target: null,
    external_post_id: null,
    publish_container_id: null,
    publish_error: null,
    publish_attempted_at: null,
    ai_metadata: source.ai_metadata,
    integration_metadata: source.integration_metadata,
    legacy_post_id: null,
  });

  await appendEvent(supabase, copy.id, actor, "created", {
    duplicated_from: source.id,
    titulo: copy.titulo,
  });
  return copy;
}

export async function addCardComment(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem: string },
): Promise<void> {
  assertAction(actor.role, "comment");
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await appendEvent(supabase, input.card_id, actor, "commented", {
    mensagem: input.mensagem,
  });
}

export async function refreshCardChecklist(
  supabase: SupabaseClient,
  cardId: string,
): Promise<ContentCard> {
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = getSupabaseAdmin();
  const card = await contentCardRepository.findById(supabase, cardId);
  if (!card) throw new Error("Card não encontrado");
  const attachments = await contentCardAttachmentRepository.listByCardId(admin, cardId);
  const checklist = syncAutoChecklist(card, attachments);
  return contentCardRepository.update(admin, cardId, { checklist });
}
