import { createError, defineEventHandler, getRequestHeader } from "h3";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { syncAllInstagramMediaConnections } from "@/modules/instagram-posts/instagram-media-sync.server";

function assertCronAuth(event: { headers: Headers }): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: "CRON_SECRET não configurado" });
  }

  const auth = getRequestHeader(event, "authorization");
  if (auth !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}

/** Cron diário — sincroniza publicações Instagram de todas as conexões ativas. */
export default defineEventHandler(async (event) => {
  assertCronAuth(event);

  const startedAt = new Date().toISOString();
  const summary = await syncAllInstagramMediaConnections(getSupabaseAdmin());

  return {
    ok: summary.failed === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...summary,
  };
});
