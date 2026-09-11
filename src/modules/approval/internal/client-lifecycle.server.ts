import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import type { LifecycleActor } from "./card-lifecycle.server";
import { assertCardAction } from "../permissions/resolve-card-action";
import { assertCardInClientAccess } from "./client-access.server";
import { canClientTransitionStatus } from "../workflow/status-machine";
import { eventTypeForTransition } from "../services/event-type-for-transition";
import type { ContentCard } from "../types/content-card";
import { combineBrazilSchedule } from "../services/brazil-schedule";

async function appendClientEvent(
  supabase: SupabaseClient,
  cardId: string,
  actor: LifecycleActor,
  eventType: Parameters<typeof contentCardEventRepository.append>[1]["event_type"],
  payload: Record<string, unknown>,
) {
  const event = await contentCardEventRepository.append(supabase, {
    card_id: cardId,
    actor_id: actor.userId,
    actor_email: actor.email,
    event_type: eventType,
    payload,
  });

  if (eventType === "approved" || eventType === "changes_requested") {
    const card = await contentCardRepository.findById(supabase, cardId);
    if (card) {
      const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { insertAppNotifications } = await import(
        "@/modules/notifications/insert-app-notifications.server"
      );
      const recipients = new Set<string>();
      if (card.responsavel_user_id) recipients.add(card.responsavel_user_id);
      if (card.created_by) recipients.add(card.created_by);
      recipients.delete(actor.userId);
      const kind = eventType === "approved" ? "aprovacao" : "reprovacao";
      const title =
        eventType === "approved"
          ? `Aprovação: ${card.titulo}`
          : `Alteração pedida: ${card.titulo}`;
      try {
        await insertAppNotifications(
          getSupabaseAdmin(),
          [...recipients].map((userId) => ({
            userId,
            kind,
            title,
            body: typeof payload.mensagem === "string" ? payload.mensagem : undefined,
            href: `/admin/aprovacoes?cliente=${card.cadastro_cliente_id}&card=${card.id}`,
            payload: { cardId: card.id, eventType },
          })),
        );
      } catch {
        // Notificação não pode reverter aprovação já gravada.
      }
    }
  }

  return event;
}

export async function clientApproveCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem?: string | null },
): Promise<ContentCard> {
  assertCardAction({ role: actor.role, action: "approve" });
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await assertCardInClientAccess(supabase, actor.userId, card.cadastro_cliente_id);

  if (card.status === "aguardando_aprovacao") {
    if (!canClientTransitionStatus(card.status, "aguardando_material")) {
      throw new Error("Transição de aprovação inválida.");
    }
    const attachments = await contentCardAttachmentRepository.listByCardId(supabase, card.id);
    const hasMaterial = attachments.some((a) => a.media_role === "cliente_material");
    if (!hasMaterial) {
      throw new Error("Anexe as mídias gravadas a partir do roteiro antes de aprovar.");
    }
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updated = await contentCardRepository.update(getSupabaseAdmin(), card.id, {
      status: "aguardando_material",
    });
    await appendClientEvent(supabase, card.id, actor, "approved", {
      kind: "roteiro",
      mensagem: input.mensagem?.trim() || null,
      status_de: card.status,
      status_para: "aguardando_material",
    });
    return updated;
  }

  if (card.status === "aguardando_aprovacao_final") {
    if (!canClientTransitionStatus(card.status, "agendado")) {
      throw new Error("Transição de aprovação inválida.");
    }
    const scheduledAt =
      card.scheduled_publish_at ||
      combineBrazilSchedule(card.data_publicacao, card.hora_publicacao);
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updated = await contentCardRepository.update(getSupabaseAdmin(), card.id, {
      status: "agendado",
      scheduled_publish_at: scheduledAt,
      publish_status: "scheduled",
      publish_target: "instagram",
      publish_error: null,
    });
    await appendClientEvent(supabase, card.id, actor, "approved", {
      kind: "peca",
      mensagem: input.mensagem?.trim() || null,
      status_de: card.status,
      status_para: "agendado",
    });
    return updated;
  }

  throw new Error("Só é possível aprovar conteúdos aguardando aprovação.");
}

export async function clientRequestChanges(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem: string },
): Promise<ContentCard> {
  assertCardAction({ role: actor.role, action: "request_changes" });
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await assertCardInClientAccess(supabase, actor.userId, card.cadastro_cliente_id);
  if (!input.mensagem.trim()) {
    throw new Error("Descreva a alteração solicitada.");
  }

  if (card.status === "aguardando_aprovacao") {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updated = await contentCardRepository.update(getSupabaseAdmin(), card.id, {
      status: "alteracoes_roteiro",
    });
    await appendClientEvent(supabase, card.id, actor, "changes_requested", {
      mensagem: input.mensagem.trim(),
      kind: "roteiro",
      status_de: card.status,
      status_para: "alteracoes_roteiro",
    });
    return updated;
  }

  if (card.status === "aguardando_aprovacao_final") {
    const checklist = card.checklist.map((c) =>
      c.id === "preview_ok" ? { ...c, done: false } : c,
    );
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updated = await contentCardRepository.update(getSupabaseAdmin(), card.id, {
      status: "alteracoes_design",
      checklist,
    });
    await appendClientEvent(supabase, card.id, actor, "changes_requested", {
      mensagem: input.mensagem.trim(),
      kind: "peca",
      status_de: card.status,
      status_para: "alteracoes_design",
    });
    return updated;
  }

  throw new Error("Só é possível solicitar alteração em conteúdos aguardando aprovação.");
}

export async function clientSubmitMaterial(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string },
): Promise<ContentCard> {
  assertCardAction({ role: actor.role, action: "upload_material" });
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await assertCardInClientAccess(supabase, actor.userId, card.cadastro_cliente_id);
  if (card.status === "aguardando_aprovacao") {
    return clientApproveCard(supabase, actor, { card_id: input.card_id });
  }
  if (card.status === "aguardando_material") {
    return card;
  }
  throw new Error("Envie as mídias junto com a aprovação do roteiro.");
}

export async function clientAddComment(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem: string },
): Promise<void> {
  assertCardAction({ role: actor.role, action: "comment" });
  const card = await contentCardRepository.findById(supabase, input.card_id);
  if (!card) throw new Error("Card não encontrado");
  await assertCardInClientAccess(supabase, actor.userId, card.cadastro_cliente_id);
  if (!input.mensagem.trim()) throw new Error("Comentário vazio.");
  await appendClientEvent(supabase, input.card_id, actor, "commented", {
    mensagem: input.mensagem.trim(),
  });
}

export async function clientCommentCard(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem: string },
): Promise<void> {
  return clientAddComment(supabase, actor, input);
}

/** @deprecated */
export async function clientApproveCardLegacy(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  input: { card_id: string; mensagem?: string | null },
): Promise<void> {
  await clientApproveCard(supabase, actor, input);
}
