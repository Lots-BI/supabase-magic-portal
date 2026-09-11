import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { assertClientPortalAccess } from "@/modules/approval/internal/client-access.server";
import { syncGa4ProfileConnection } from "./ga4-profile-sync.server";

const syncInputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
});

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

export const syncGa4ProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => syncInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertClienteAccess(context, data.cadastroClienteId);

    const { data: connection, error } = await getSupabaseAdmin()
      .from("ph_connections")
      .select("id")
      .eq("cadastro_id", data.cadastroClienteId)
      .eq("plugin_key", "ga4")
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connection?.id) {
      return { ok: false, error: "GA4 não conectado para este cliente" };
    }

    const result = await syncGa4ProfileConnection(getSupabaseAdmin(), connection.id);
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
