import type { SupabaseClient } from "@supabase/supabase-js";
import { TIKTOK_CAPABILITIES } from "@/modules/platform-hub/plugins/tiktok/tiktok.capabilities";
import { TIKTOK_PLATFORM_LABEL } from "@/modules/platform-hub/plugins/tiktok/providers/official-tiktok.provider";
import {
  syncAllOfficialPluginConnections,
  syncOfficialPluginConnection,
} from "@/modules/platform-hub-bridges/ph-persistence/sync-official-plugin.server";

const LOOKBACK_DAYS = 89;
const MAX_DAYS = 89;
const REFRESH_DAYS = 3;

export function syncTikTokCampaignsConnection(supabase: SupabaseClient, connectionId: string) {
  return syncOfficialPluginConnection(supabase, connectionId, {
    pluginKey: "tiktok",
    capability: TIKTOK_CAPABILITIES[0],
    platformLabel: TIKTOK_PLATFORM_LABEL,
    plataformaMatch: "tiktok",
    lookbackDays: LOOKBACK_DAYS,
    maxDaysPerRun: MAX_DAYS,
    refreshDays: REFRESH_DAYS,
    emptyError: "O TikTok não devolveu métricas para o período. Confira a conexão de anúncios.",
  });
}

export function syncAllTikTokCampaignsConnections(supabase: SupabaseClient) {
  return syncAllOfficialPluginConnections(supabase, "tiktok", (connectionId) =>
    syncTikTokCampaignsConnection(supabase, connectionId),
  );
}
