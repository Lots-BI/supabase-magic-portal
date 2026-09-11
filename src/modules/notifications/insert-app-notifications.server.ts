import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationKind } from "@/lib/notifications";

export async function insertAppNotifications(
  supabase: SupabaseClient,
  rows: ReadonlyArray<{
    userId: string;
    kind: NotificationKind;
    title: string;
    body?: string | null;
    href?: string | null;
    payload?: Record<string, unknown>;
  }>,
): Promise<void> {
  const unique = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.userId) continue;
    unique.set(`${row.userId}:${row.title}:${row.href ?? ""}`, row);
  }
  const payload = [...unique.values()].map((row) => ({
    user_id: row.userId,
    kind: row.kind,
    title: row.title,
    body: row.body ?? null,
    href: row.href ?? null,
    payload: row.payload ?? {},
  }));
  if (payload.length === 0) return;
  const { error } = await supabase.from("app_notifications").insert(payload);
  if (error) throw new Error(`app_notifications insert failed: ${error.message}`);
}
