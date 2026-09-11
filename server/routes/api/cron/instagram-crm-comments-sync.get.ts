import { defineEventHandler } from "h3";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { syncAllCrmComments } from "@/modules/crm/ingest/sync-comments.server";
import { assertCronAuth } from "../../../lib/cron-auth";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";

/** Cron diário — comentários Instagram identificáveis para o CRM. */
export default defineEventHandler(async (event) => {
  assertCronAuth(event);

  const startedAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const summary = await syncAllCrmComments(supabase);

  if (summary.failed > 0) {
    const stack = await createAdminHubStack(supabase);
    await stack.timeline.append({
      kind: "sync_failed",
      title: `Cron CRM comments: ${summary.failed} falha(s)`,
      metadata: { failed: summary.failed, total: summary.total },
    });
  }

  return {
    ok: summary.failed === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...summary,
  };
});
