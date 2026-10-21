import type { SupabaseClient } from "@supabase/supabase-js";
import { GOOGLE_BUSINESS_CAPABILITIES } from "@/modules/platform-hub/plugins/google_business/google_business.capabilities";
import { GOOGLE_BUSINESS_PLATFORM_LABEL } from "@/modules/platform-hub/plugins/google_business/providers/official-google-business.provider";
import {
  syncAllOfficialPluginConnections,
  syncOfficialPluginConnection,
} from "@/modules/platform-hub-bridges/ph-persistence/sync-official-plugin.server";

const LOOKBACK_DAYS = 89;
const MAX_DAYS = 89;
const REFRESH_DAYS = 3;

export function syncGoogleBusinessProfileConnection(
  supabase: SupabaseClient,
  connectionId: string,
) {
  return syncOfficialPluginConnection(supabase, connectionId, {
    pluginKey: "google_business",
    capability: GOOGLE_BUSINESS_CAPABILITIES[0],
    platformLabel: GOOGLE_BUSINESS_PLATFORM_LABEL,
    plataformaMatch: "google business",
    lookbackDays: LOOKBACK_DAYS,
    maxDaysPerRun: MAX_DAYS,
    refreshDays: REFRESH_DAYS,
    emptyError:
      "O Google Business não devolveu métricas para o período. Confira a conexão do perfil.",
  });
}

export function syncAllGoogleBusinessProfileConnections(supabase: SupabaseClient) {
  return syncAllOfficialPluginConnections(supabase, "google_business", (connectionId) =>
    syncGoogleBusinessProfileConnection(supabase, connectionId),
  );
}
