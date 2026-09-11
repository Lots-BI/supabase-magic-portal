import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientAccessScope } from "./client-access.server";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import { buildKanbanBoard } from "../services/build-kanban-board";
import { buildCardTimeline } from "../services/build-card-timeline";
import { listCardAttachmentsWithUrls } from "./attachment-lifecycle.server";
import { loadPublishedIgForCard, type CardDetail } from "./card-query.server";

export async function getClientKanbanBoard(supabase: SupabaseClient, scope: ClientAccessScope) {
  const cards = await contentCardRepository.listForCadastroClienteIds(
    supabase,
    scope.cadastroClienteIds,
    { excludeArchived: true },
  );
  // Rascunhos internos (roteiro) não entram na fila do cliente.
  return buildKanbanBoard(cards.filter((c) => c.status !== "roteiro"));
}

export async function getClientCardDetail(
  supabase: SupabaseClient,
  cardId: string,
  scope: ClientAccessScope,
): Promise<CardDetail | null> {
  const card = await contentCardRepository.findByIdForCadastroClienteIds(
    supabase,
    cardId,
    scope.cadastroClienteIds,
  );
  if (!card) return null;
  if (card.status === "roteiro") return null;

  const [events, attachments, publishedIg] = await Promise.all([
    contentCardEventRepository.listByCardId(supabase, cardId),
    listCardAttachmentsWithUrls(supabase, cardId, card.capa_url),
    loadPublishedIgForCard(supabase, card),
  ]);

  let pillar: CardDetail["pillar"] = null;
  if (card.pilar_id) {
    const p = await editorialPillarRepository.findById(supabase, card.pilar_id);
    if (p) pillar = { id: p.id, titulo: p.titulo, objetivo: p.objetivo, cor: p.cor };
  }

  return {
    card,
    events: buildCardTimeline(events),
    attachments,
    pillar,
    publishedIg,
  };
}
