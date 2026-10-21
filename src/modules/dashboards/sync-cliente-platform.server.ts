import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertClientPortalAccess } from "@/modules/approval/internal/client-access.server";
import { assertCadastroAllowed, loadCallerAccess } from "@/modules/access/organization.server";
import { syncGa4ProfileConnection } from "@/modules/ga4/ga4-profile-sync.server";
import { syncGoogleAdsCampaignsConnection } from "@/modules/google-ads/google-ads-campaigns-sync.server";
import { syncGoogleBusinessProfileConnection } from "@/modules/google-business/google-business-profile-sync.server";
import { syncInstagramMediaConnection } from "@/modules/instagram-posts/instagram-media-sync.server";
import { syncInstagramProfileConnection } from "@/modules/instagram-posts/instagram-profile-sync.server";
import { syncMetaAdsCampaignsConnection } from "@/modules/meta-ads/meta-ads-campaigns-sync.server";
import { syncTikTokCampaignsConnection } from "@/modules/tiktok/tiktok-campaigns-sync.server";
import { syncYouTubeChannelConnection } from "@/modules/youtube/youtube-channel-sync.server";
import {
  CLIENTE_SYNC_LABEL,
  CLIENTE_SYNC_PLATFORMS,
  hubPluginKeyForSync,
  type ClienteSyncPlatform,
} from "./cliente-sync-platform";

const inputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
  platform: z.enum(CLIENTE_SYNC_PLATFORMS),
});

export type ClientePlatformSyncResult = {
  ok: boolean;
  error?: string;
  daysFilled?: number;
  daysRequested?: number;
  mediaCount?: number;
};

async function assertClienteAccess(
  context: {
    supabase: import("@supabase/supabase-js").SupabaseClient;
    userId: string;
    claims?: { email?: string | null };
  },
  cadastroClienteId: number,
): Promise<void> {
  const access = await loadCallerAccess(context);
  if (access.isPlatformOwner || access.isGlobalAdmin) return;
  if (access.isOperational) {
    assertCadastroAllowed(access, cadastroClienteId);
    return;
  }

  const scope = await assertClientPortalAccess(context);
  if (!scope.cadastroClienteIds.includes(cadastroClienteId)) {
    throw new Error("Sem permissão para este cliente");
  }
}

async function findActiveConnection(cadastroClienteId: number, platform: ClienteSyncPlatform) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ph_connections")
    .select("id")
    .eq("cadastro_id", cadastroClienteId)
    .eq("plugin_key", hubPluginKeyForSync(platform))
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function runPlatformSync(
  connectionId: string,
  platform: ClienteSyncPlatform,
): Promise<ClientePlatformSyncResult> {
  const supabase = getSupabaseAdmin();

  if (platform === "publicacoes") {
    const result = await syncInstagramMediaConnection(supabase, connectionId);
    if (!result.ok) return { ok: false, error: result.error ?? "Falha na sincronização" };
    return { ok: true, mediaCount: result.mediaCount ?? 0 };
  }

  const runners: Record<
    Exclude<ClienteSyncPlatform, "publicacoes">,
    (id: string) => Promise<{
      ok: boolean;
      error?: string;
      daysFilled?: number;
      daysRequested?: number;
    }>
  > = {
    meta_ads: (id) => syncMetaAdsCampaignsConnection(supabase, id),
    google_ads: (id) => syncGoogleAdsCampaignsConnection(supabase, id),
    ga4: (id) => syncGa4ProfileConnection(supabase, id),
    instagram: (id) => syncInstagramProfileConnection(supabase, id),
    tiktok: (id) => syncTikTokCampaignsConnection(supabase, id),
    youtube: (id) => syncYouTubeChannelConnection(supabase, id),
    google_business: (id) => syncGoogleBusinessProfileConnection(supabase, id),
  };

  const result = await runners[platform](connectionId);
  if (!result.ok) return { ok: false, error: result.error ?? "Falha na sincronização" };
  return {
    ok: true,
    daysFilled: result.daysFilled,
    daysRequested: result.daysRequested,
  };
}

/** Puxa a série de UMA plataforma de UM cliente. Não varre o portfólio. */
export const syncClientePlatformFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<ClientePlatformSyncResult> => {
    await assertClienteAccess(context, data.cadastroClienteId);

    const connectionId = await findActiveConnection(data.cadastroClienteId, data.platform);
    if (!connectionId) {
      return {
        ok: false,
        error: `${CLIENTE_SYNC_LABEL[data.platform]} não conectado para este cliente`,
      };
    }

    return runPlatformSync(connectionId, data.platform);
  });
