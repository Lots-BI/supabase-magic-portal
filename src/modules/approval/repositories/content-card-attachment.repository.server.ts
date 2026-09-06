import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentCardAttachment,
  ContentCardAttachmentInsert,
} from "../types/content-card-attachment";
import { mapContentCardAttachmentRow } from "./row-mappers";

const TABLE = "content_card_attachments";

export const contentCardAttachmentRepository = {
  async listByCardId(supabase: SupabaseClient, cardId: string): Promise<ContentCardAttachment[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("card_id", cardId)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContentCardAttachmentRow);
  },

  async listByCardIds(
    supabase: SupabaseClient,
    cardIds: string[],
  ): Promise<ContentCardAttachment[]> {
    if (cardIds.length === 0) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in("card_id", cardIds)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapContentCardAttachmentRow);
  },

  async insert(
    supabase: SupabaseClient,
    row: ContentCardAttachmentInsert,
  ): Promise<ContentCardAttachment> {
    const { data, error } = await supabase.from(TABLE).insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return mapContentCardAttachmentRow(data);
  },

  async deleteById(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export type ContentCardAttachmentRepository = typeof contentCardAttachmentRepository;
