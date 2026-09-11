import { defineEventHandler } from "h3";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { runDuePublishes } from "@/modules/approval/jobs/publish-due.server";
import { assertCronAuth } from "../../../lib/cron-auth";

/** Cron frequente — publica cards aprovados cujo horário já chegou. */
export default defineEventHandler(async (event) => {
  assertCronAuth(event);
  const startedAt = new Date().toISOString();
  const summary = await runDuePublishes(getSupabaseAdmin());

  return {
    ok: summary.failed === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...summary,
  };
});
