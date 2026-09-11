import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppNotification } from "@/lib/notifications";

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    kind: row.kind as AppNotification["kind"],
    title: String(row.title),
    body: row.body != null ? String(row.body) : undefined,
    href: row.href != null ? String(row.href) : undefined,
    createdAt: String(row.created_at),
    read: row.read_at != null,
  };
}

export const listAppNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("app_notifications")
      .select("id, kind, title, body, href, read_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) return [];
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  });

export const markAppNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllAppNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
