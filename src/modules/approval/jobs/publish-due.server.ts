import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { FEATURE_META_CONTENT_PUBLISH } from "@/lib/feature-flags";
import { publishCardWithClient } from "../integrations/meta-instagram-publisher.server";
import { publishPlatformError, resolvePublishPlatform } from "../integrations/publish-platform";
import { publishYouTubeCard } from "../integrations/publish-youtube-card.server";

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

export async function runDuePublishes(_supabase?: SupabaseClient): Promise<{
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
    .select("id, plataforma")
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
    const platform = resolvePublishPlatform((row as { plataforma?: string }).plataforma);
    try {
      const claimed = await claimDueCard(supabase, id, nowIso, staleIso);
      if (!claimed) continue;
      if (platform === "youtube") {
        await publishYouTubeCard(supabase, id);
        succeeded += 1;
        continue;
      }
      if (platform !== "instagram") {
        const message =
          platform === "tiktok"
            ? "A conexão TikTok é de anúncios. Ela coleta métricas e não publica vídeo no perfil."
            : publishPlatformError((row as { plataforma?: string }).plataforma);
        await supabase
          .from("content_cards")
          .update({ publish_status: "failed", publish_error: message })
          .eq("id", id);
        failed += 1;
        continue;
      }
      await publishCardWithClient(supabase, id);
      succeeded += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "Falha ao publicar";
      await supabase
        .from("content_cards")
        .update({ publish_status: "failed", publish_error: message })
        .eq("id", id);
    }
  }
  return { processed: (data ?? []).length, succeeded, failed };
}
