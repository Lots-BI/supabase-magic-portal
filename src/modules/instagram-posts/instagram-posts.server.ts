import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveIsAdmin } from "@/lib/owner-admin";
import { assertClientPortalAccess } from "@/modules/approval/internal/client-access.server";
import { syncInstagramMediaConnection } from "./instagram-media-sync.server";
import { syncInstagramProfileConnection } from "./instagram-profile-sync.server";
import type { IgMediaMetrics, IgMediaRow } from "./types";

const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const PROFILE_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

const listInputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  productType: z.string().optional(),
});

const syncInputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
});

const syncProfileInputSchema = z.object({
  cadastroClienteId: z.number().int().positive(),
});

function mapRow(row: Record<string, unknown>): IgMediaRow {
  return {
    id: String(row.id),
    cadastro_cliente_id: Number(row.cadastro_cliente_id),
    ig_media_id: String(row.ig_media_id),
    media_product_type: String(row.media_product_type),
    media_type: String(row.media_type),
    caption: row.caption != null ? String(row.caption) : null,
    permalink: row.permalink != null ? String(row.permalink) : null,
    media_url: row.media_url != null ? String(row.media_url) : null,
    thumbnail_url: row.thumbnail_url != null ? String(row.thumbnail_url) : null,
    thumbnail_storage_path:
      row.thumbnail_storage_path != null ? String(row.thumbnail_storage_path) : null,
    published_at: String(row.published_at),
    metrics: (row.metrics as IgMediaMetrics) ?? {},
    metrics_collected_at:
      row.metrics_collected_at != null ? String(row.metrics_collected_at) : null,
    last_synced_at: row.last_synced_at != null ? String(row.last_synced_at) : null,
    content_card_id: row.content_card_id != null ? String(row.content_card_id) : null,
    cliente_nome: row.cliente_nome != null ? String(row.cliente_nome) : undefined,
    cliente_slug: row.cliente_slug != null ? String(row.cliente_slug) : undefined,
  };
}

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

async function findInstagramConnection(cadastroClienteId: number) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ph_connections")
    .select("id, plugin_key, status, active_provider_type")
    .eq("cadastro_id", cadastroClienteId)
    .eq("plugin_key", "instagram_organic")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const listInstagramPostsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertClienteAccess(context, data.cadastroClienteId);

    let query = context.supabase
      .from("vw_ig_media_dashboard")
      .select("*")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .order("published_at", { ascending: false });

    if (data.from) query = query.gte("published_at", `${data.from}T00:00:00.000Z`);
    if (data.to) query = query.lte("published_at", `${data.to}T23:59:59.999Z`);
    if (data.productType && data.productType !== "all") {
      if (data.productType.toUpperCase() === "CAROUSEL") {
        query = query.eq("media_type", "CAROUSEL_ALBUM");
      } else {
        query = query.eq("media_product_type", data.productType.toUpperCase());
      }
    }

    const { data: rows, error } = await query.limit(500);
    if (error) throw new Error(error.message);

    const connection = await findInstagramConnection(data.cadastroClienteId);

    return {
      posts: (rows ?? []).map((row) => mapRow(row as Record<string, unknown>)),
      hasConnection: Boolean(connection),
      lastSyncedAt: rows?.[0]?.last_synced_at != null ? String(rows[0].last_synced_at) : null,
    };
  });

export const syncInstagramPostsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => syncInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertClienteAccess(context, data.cadastroClienteId);

    const connection = await findInstagramConnection(data.cadastroClienteId);
    if (!connection?.id) {
      return { ok: false, error: "Instagram não conectado para este cliente" };
    }

    const supabase = getSupabaseAdmin();
    const { data: latest } = await supabase
      .from("ig_media")
      .select("last_synced_at")
      .eq("cadastro_cliente_id", data.cadastroClienteId)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.last_synced_at) {
      const elapsed = Date.now() - new Date(String(latest.last_synced_at)).getTime();
      if (elapsed < SYNC_COOLDOWN_MS) {
        return {
          ok: false,
          error: "Aguarde alguns minutos antes de puxar métricas novamente",
          cooldownMs: SYNC_COOLDOWN_MS - elapsed,
        };
      }
    }

    const result = await syncInstagramMediaConnection(supabase, connection.id);
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Falha na sincronização" };
    }

    return {
      ok: true,
      mediaCount: result.mediaCount ?? 0,
      lastSyncedAt: new Date().toISOString(),
    };
  });

export const syncInstagramProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => syncProfileInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertClienteAccess(context, data.cadastroClienteId);

    const connection = await findInstagramConnection(data.cadastroClienteId);
    if (!connection?.id) {
      return { ok: false, error: "Instagram não conectado para este cliente" };
    }

    const supabase = getSupabaseAdmin();
    const { data: cadastro } = await supabase
      .from("cadastro_clientes")
      .select("nome_cliente")
      .eq("id", data.cadastroClienteId)
      .maybeSingle();

    const { data: recentHub } = cadastro?.nome_cliente
      ? await supabase
          .from("base_metricas_hub")
          .select("created_at")
          .eq("cliente", cadastro.nome_cliente)
          .ilike("plataforma", "instagram")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

    if (recentHub?.created_at) {
      const elapsed = Date.now() - new Date(String(recentHub.created_at)).getTime();
      if (elapsed < PROFILE_SYNC_COOLDOWN_MS) {
        return {
          ok: false,
          error: "Aguarde alguns minutos antes de puxar métricas novamente",
          cooldownMs: PROFILE_SYNC_COOLDOWN_MS - elapsed,
        };
      }
    }

    const result = await syncInstagramProfileConnection(supabase, connection.id);
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

export const getInstagramPostThumbUrlFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cadastroClienteId: z.number().int().positive(), storagePath: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertClienteAccess(context, data.cadastroClienteId);
    const { data: signed, error } = await context.supabase.storage
      .from("ig-media-thumbs")
      .createSignedUrl(data.storagePath, 3600);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });
