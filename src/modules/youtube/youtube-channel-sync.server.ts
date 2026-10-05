import type { SupabaseClient } from "@supabase/supabase-js";
import { YOUTUBE_CAPABILITIES } from "@/modules/platform-hub/plugins/youtube/youtube.capabilities";
import { YOUTUBE_PLATFORM_LABEL } from "@/modules/platform-hub/plugins/youtube/providers/official-youtube.provider";
import {
  syncAllOfficialPluginConnections,
  syncOfficialPluginConnection,
} from "@/modules/platform-hub-bridges/ph-persistence/sync-official-plugin.server";

const LOOKBACK_DAYS = 89;
const MAX_DAYS = 89;
const REFRESH_DAYS = 3;

export function syncYouTubeChannelConnection(supabase: SupabaseClient, connectionId: string) {
  return syncOfficialPluginConnection(supabase, connectionId, {
    pluginKey: "youtube",
    capability: YOUTUBE_CAPABILITIES[0],
    platformLabel: YOUTUBE_PLATFORM_LABEL,
    plataformaMatch: "youtube",
    lookbackDays: LOOKBACK_DAYS,
    maxDaysPerRun: MAX_DAYS,
    refreshDays: REFRESH_DAYS,
    emptyError: "O YouTube não devolveu métricas para o período. Confira a conexão do canal.",
  });
}

export function syncAllYouTubeChannelConnections(supabase: SupabaseClient) {
  return syncAllOfficialPluginConnections(supabase, "youtube", (connectionId) =>
    syncYouTubeChannelConnection(supabase, connectionId),
  );
}
