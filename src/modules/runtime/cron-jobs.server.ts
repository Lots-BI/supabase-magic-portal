import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { createAdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import { syncAllInstagramMediaConnections } from "@/modules/instagram-posts/instagram-media-sync.server";
import { syncAllInstagramProfileConnections } from "@/modules/instagram-posts/instagram-profile-sync.server";
import { syncAllMetaAdsCampaignsConnections } from "@/modules/meta-ads/meta-ads-campaigns-sync.server";
import { syncAllGoogleAdsCampaignsConnections } from "@/modules/google-ads/google-ads-campaigns-sync.server";
import { syncAllGa4ProfileConnections } from "@/modules/ga4/ga4-profile-sync.server";
import { syncAllCrmComments } from "@/modules/crm/ingest/sync-comments.server";
import { syncAllCrmDirect } from "@/modules/crm/ingest/sync-direct.server";
import { runDuePublishes } from "@/modules/approval/jobs/publish-due.server";

async function withTimeline(
  title: string,
  failed: number,
  total: number,
) {
  if (failed <= 0) return;
  const stack = await createAdminHubStack(getSupabaseAdmin());
  await stack.timeline.append({
    kind: "sync_failed",
    title,
    metadata: { failed, total },
  });
}

function envelope<T extends { failed: number; total: number }>(summary: T) {
  return {
    ok: summary.failed === 0,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...summary,
  };
}

export async function runInstagramMediaCron() {
  const summary = await syncAllInstagramMediaConnections(getSupabaseAdmin());
  await withTimeline(`Cron Instagram media: ${summary.failed} falha(s)`, summary.failed, summary.total);
  return envelope(summary);
}

export async function runInstagramProfileCron() {
  const summary = await syncAllInstagramProfileConnections(getSupabaseAdmin());
  await withTimeline(`Cron Instagram perfil: ${summary.failed} falha(s)`, summary.failed, summary.total);
  return envelope(summary);
}

export async function runMetaAdsCron() {
  const summary = await syncAllMetaAdsCampaignsConnections(getSupabaseAdmin());
  await withTimeline(`Cron Meta Ads: ${summary.failed} falha(s)`, summary.failed, summary.total);
  return envelope(summary);
}

export async function runGoogleAdsCron() {
  const summary = await syncAllGoogleAdsCampaignsConnections(getSupabaseAdmin());
  await withTimeline(`Cron Google Ads: ${summary.failed} falha(s)`, summary.failed, summary.total);
  return envelope(summary);
}

export async function runGa4Cron() {
  const summary = await syncAllGa4ProfileConnections(getSupabaseAdmin());
  await withTimeline(`Cron GA4: ${summary.failed} falha(s)`, summary.failed, summary.total);
  return envelope(summary);
}

export async function runCrmIngestCron() {
  const supabase = getSupabaseAdmin();
  const comments = await syncAllCrmComments(supabase);
  let direct: Awaited<ReturnType<typeof syncAllCrmDirect>>;
  try {
    direct = await syncAllCrmDirect(supabase);
  } catch (error) {
    direct = {
      total: 0,
      succeeded: 0,
      failed: 1,
      results: [
        {
          cadastroClienteId: null,
          result: {
            ok: false,
            conversationsScanned: 0,
            messagesFetched: 0,
            peopleTouched: 0,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      ],
    };
  }
  const failed = comments.failed + direct.failed;
  await withTimeline(`Cron CRM: ${failed} falha(s)`, failed, comments.total + direct.total);
  return {
    ok: comments.failed === 0,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...comments,
    direct,
  };
}

export async function runConteudosPublishDueCron() {
  const summary = await runDuePublishes(getSupabaseAdmin());
  return {
    ok: summary.failed === 0,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...summary,
  };
}
