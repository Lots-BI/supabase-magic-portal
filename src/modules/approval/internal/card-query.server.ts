import type { SupabaseClient } from "@supabase/supabase-js";
import { contentCardRepository } from "../repositories/content-card.repository.server";
import { contentCardEventRepository } from "../repositories/content-card-event.repository.server";
import { editorialPillarRepository } from "../repositories/editorial-pillar.repository.server";
import { buildKanbanBoard, type KanbanBoard } from "../services/build-kanban-board";
import { buildCardTimeline } from "../services/build-card-timeline";
import type { ContentCard } from "../types/content-card";
import {
  attachmentToMediaAsset,
  listCardAttachmentsWithUrls,
} from "./attachment-lifecycle.server";
import { contentCardAttachmentRepository } from "../repositories/content-card-attachment.repository.server";
import type { MediaAsset } from "@/lib/media-preview";

export async function getKanbanBoardForClient(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<KanbanBoard> {
  const cards = await contentCardRepository.listByClient(supabase, {
    cadastroClienteId,
    excludeArchived: true,
  });
  return buildKanbanBoard(cards);
}

export type CardDetail = {
  card: ContentCard;
  events: ReturnType<typeof buildCardTimeline>;
  attachments: Awaited<ReturnType<typeof listCardAttachmentsWithUrls>>;
  pillar: { id: string; titulo: string; objetivo: string | null; cor: string } | null;
};

export async function getCardDetail(
  supabase: SupabaseClient,
  cardId: string,
): Promise<CardDetail | null> {
  const card = await contentCardRepository.findById(supabase, cardId);
  if (!card) return null;

  const [events, attachments] = await Promise.all([
    contentCardEventRepository.listByCardId(supabase, cardId),
    listCardAttachmentsWithUrls(supabase, cardId, card.capa_url),
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
  };
}

export type MaterialInboxItem = {
  card: ContentCard;
  materials: MediaAsset[];
};

/** Slots do calendário + mídias do cliente, organizados para download da agência. */
export async function listMaterialInbox(
  supabase: SupabaseClient,
  cadastroClienteId: number,
): Promise<MaterialInboxItem[]> {
  const cards = await contentCardRepository.listByClient(supabase, {
    cadastroClienteId,
    excludeArchived: true,
  });
  cards.sort((a, b) => {
    const byDate = a.data_publicacao.localeCompare(b.data_publicacao);
    if (byDate !== 0) return byDate;
    return (a.hora_publicacao ?? "").localeCompare(b.hora_publicacao ?? "");
  });
  const attachments = await contentCardAttachmentRepository.listByCardIds(
    supabase,
    cards.map((c) => c.id),
  );
  const byCard = new Map<string, typeof attachments>();
  for (const row of attachments) {
    if (row.media_role !== "cliente_material") continue;
    const list = byCard.get(row.card_id) ?? [];
    list.push(row);
    byCard.set(row.card_id, list);
  }
  const items: MaterialInboxItem[] = [];
  for (const card of cards) {
    const rows = byCard.get(card.id) ?? [];
    const materials: MediaAsset[] = [];
    for (const row of rows) {
      materials.push(await attachmentToMediaAsset(row));
    }
    items.push({ card, materials });
  }
  return items;
}
