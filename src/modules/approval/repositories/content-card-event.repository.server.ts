import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentCardEvent, ContentCardEventInsert } from "../types/content-card-event";
import { mapContentCardEventRow } from "./row-mappers";

const TABLE = "content_card_events";

export const contentCardEventRepository = {
  async listByCardId(supabase: SupabaseClient, cardId: string): Promise<ContentCardEvent[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContentCardEventRow);
  },

  async listChangeKindsByCardIds(
    supabase: SupabaseClient,
    cardIds: string[],
  ): Promise<Record<string, { roteiro: boolean; peca: boolean }>> {
    const result: Record<string, { roteiro: boolean; peca: boolean }> = {};
    if (cardIds.length === 0) return result;
    const { data, error } = await supabase
      .from(TABLE)
      .select("card_id, payload")
      .in("card_id", cardIds)
      .eq("event_type", "changes_requested");
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const id = String(row.card_id);
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const flags = result[id] ?? { roteiro: false, peca: false };
      if (payload.kind === "peca" || payload.status_para === "alteracoes_design") {
        flags.peca = true;
      } else {
        flags.roteiro = true;
      }
      result[id] = flags;
    }
    return result;
  },

  /** Append-only — única operação de escrita permitida. */
  async append(supabase: SupabaseClient, event: ContentCardEventInsert): Promise<ContentCardEvent> {
    const { data, error } = await supabase.from(TABLE).insert(event).select("*").single();
    if (error) throw new Error(error.message);
    return mapContentCardEventRow(data);
  },
};

export type ContentCardEventRepository = typeof contentCardEventRepository;
