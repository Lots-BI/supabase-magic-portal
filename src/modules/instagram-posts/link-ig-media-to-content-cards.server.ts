import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Liga `ig_media.content_card_id` quando o Graph media id já está em
 * `content_cards.external_post_id` do mesmo cliente.
 * Não sobrescreve FK existente. Idempotente.
 */
export async function linkIgMediaToContentCards(
  supabase: SupabaseClient,
  opts: { cadastroClienteId: number; igMediaIds?: string[] },
): Promise<number> {
  let cardQuery = supabase
    .from("content_cards")
    .select("id, external_post_id")
    .eq("cadastro_cliente_id", opts.cadastroClienteId)
    .not("external_post_id", "is", null);

  if (opts.igMediaIds && opts.igMediaIds.length > 0) {
    cardQuery = cardQuery.in("external_post_id", opts.igMediaIds);
  }

  const { data: cards, error: cardError } = await cardQuery;
  if (cardError) throw new Error(cardError.message);
  if (!cards?.length) return 0;

  const byExternal = new Map<string, string>();
  for (const card of cards) {
    if (card.external_post_id) byExternal.set(String(card.external_post_id), String(card.id));
  }
  const externals = [...byExternal.keys()];
  if (externals.length === 0) return 0;

  const { data: media, error: mediaError } = await supabase
    .from("ig_media")
    .select("id, ig_media_id")
    .eq("cadastro_cliente_id", opts.cadastroClienteId)
    .in("ig_media_id", externals)
    .is("content_card_id", null);
  if (mediaError) throw new Error(mediaError.message);
  if (!media?.length) return 0;

  let linked = 0;
  for (const row of media) {
    const cardId = byExternal.get(String(row.ig_media_id));
    if (!cardId) continue;
    const { error } = await supabase
      .from("ig_media")
      .update({ content_card_id: cardId })
      .eq("id", row.id)
      .is("content_card_id", null);
    if (error) throw new Error(error.message);
    linked += 1;
  }
  return linked;
}

/** Após publicar no Instagram: tenta gravar a FK se o Hub já tiver a linha. */
export async function tryLinkIgMediaRowToCard(
  supabase: { from?: SupabaseClient["from"] },
  opts: { cadastroClienteId: number; igMediaId: string; cardId: string },
): Promise<void> {
  if (typeof supabase.from !== "function") return;
  try {
    const { error } = await supabase
      .from("ig_media")
      .update({ content_card_id: opts.cardId })
      .eq("cadastro_cliente_id", opts.cadastroClienteId)
      .eq("ig_media_id", opts.igMediaId);
    if (error) {
      console.warn("[ig-media] falha ao ligar content_card_id:", error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[ig-media] falha ao ligar content_card_id:", message);
  }
}
