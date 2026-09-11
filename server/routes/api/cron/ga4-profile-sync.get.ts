import { defineEventHandler } from "h3";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { syncAllGa4ProfileConnections } from "@/modules/ga4/ga4-profile-sync.server";
import { assertCronAuth } from "../../../lib/cron-auth";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";

export default defineEventHandler(async (event) => {
  assertCronAuth(event);

  const startedAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const summary = await syncAllGa4ProfileConnections(supabase);

  if (summary.failed > 0) {
    const stack = await createAdminHubStack(supabase);
    await stack.timeline.append({
      kind: "sync_failed",
      title: `Cron GA4: ${summary.failed} falha(s)`,
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
