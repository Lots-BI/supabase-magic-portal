import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { FEATURE_META_CONTENT_PUBLISH } from "@/lib/feature-flags";
import { publishCardWithClient } from "../integrations/meta-instagram-publisher.server";

const STALE_PUBLISHING_MS = 10 * 60 * 1000;

async function claimDueCard(
  supabase: SupabaseClient,
  cardId: string,
  nowIso: string,
  staleIso: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("content_cards")
    .update({
      publish_status: "publishing",
      publish_attempted_at: nowIso,
    })
    .eq("id", cardId)
    .neq("status", "arquivado")
    .or(
      `publish_status.eq.scheduled,publish_status.eq.queued,and(publish_status.eq.publishing,publish_attempted_at.lte.${staleIso})`,
    )
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function runDuePublishes(
  _supabase?: SupabaseClient,
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (!FEATURE_META_CONTENT_PUBLISH) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();
  const staleIso = new Date(now.getTime() - STALE_PUBLISHING_MS).toISOString();

  const { data, error } = await supabase
    .from("content_cards")
    .select("id")
    .lte("scheduled_publish_at", nowIso)
    .neq("status", "arquivado")
    .or(
      `publish_status.eq.scheduled,publish_status.eq.queued,and(publish_status.eq.publishing,publish_attempted_at.lte.${staleIso})`,
    )
    .limit(20);

  if (error) throw new Error(error.message);

  let succeeded = 0;
  let failed = 0;
  for (const row of data ?? []) {
    const id = String(row.id);
    try {
      const claimed = await claimDueCard(supabase, id, nowIso, staleIso);
      if (!claimed) continue;
      await publishCardWithClient(supabase, id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  return { processed: (data ?? []).length, succeeded, failed };
}
