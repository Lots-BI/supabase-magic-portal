import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { assertClientPortalAccess } from "@/modules/approval/internal/client-access.server";
import { syncMetaAdsCampaignsConnection } from "./meta-ads-campaigns-sync.server";

const syncInputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
});

/** Mesmo padrão de instagram-posts.server.ts: admin (suporte/testes) ou dono do cadastro. */
async function assertClienteAccess(
  context: {
    supabase: import("@supabase/supabase-js").SupabaseClient;
    userId: string;
    claims?: { email?: string | null };
  },
  cadastroClienteId: number,
): Promise<void> {
  const isAdmin = await resolveIsAdmin({
    supabase: context.supabase,
    userId: context.userId,
    email: context.claims?.email ?? undefined,
    repair: true,
  });
  if (isAdmin) return;

  const scope = await assertClientPortalAccess(context);
  if (!scope.cadastroClienteIds.includes(cadastroClienteId)) {
    throw new Error("Sem permissão para este cliente");
  }
}

async function findMetaAdsConnection(cadastroClienteId: number) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ph_connections")
    .select("id, plugin_key, status, active_provider_type")
    .eq("cadastro_id", cadastroClienteId)
    .eq("plugin_key", "meta_ads")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const syncMetaAdsCampaignsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => syncInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertClienteAccess(context, data.cadastroClienteId);

    const connection = await findMetaAdsConnection(data.cadastroClienteId);
    if (!connection?.id) {
      return { ok: false, error: "Meta Ads não conectado para este cliente" };
    }

    const result = await syncMetaAdsCampaignsConnection(getSupabaseAdmin(), connection.id);
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Falha na sincronização" };
    }

    return {
      ok: true,
      daysFilled: result.daysFilled,
      daysRequested: result.daysRequested,
      from: result.from,
      to: result.to,
    };
  });
