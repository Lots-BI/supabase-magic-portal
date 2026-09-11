import type { SupabaseClient } from "@supabase/supabase-js";
import { insertAppNotifications } from "@/modules/notifications/insert-app-notifications.server";

export async function notifyHighIntent(
  supabase: SupabaseClient,
  input: { cadastroClienteId: number; personId: string; displayName: string; score: number },
) {
  if (input.score < 70) return;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: recent } = await supabase
    .from("app_notifications")
    .select("id, payload, created_at")
    .eq("kind", "alerta")
    .gte("created_at", since)
    .limit(40);
  const already = (recent ?? []).some((row) => {
    const payload = row.payload as { personId?: string } | null;
    return payload?.personId === input.personId;
  });
  if (already) return;

  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  await insertAppNotifications(
    supabase,
    (admins ?? []).map((a) => ({
      userId: a.user_id,
      kind: "alerta" as const,
      title: `Intenção alta: ${input.displayName}`,
      body: `Score ${input.score} no CRM de audiência.`,
      href: "/admin/crm",
      payload: { personId: input.personId, cadastroClienteId: input.cadastroClienteId },
    })),
  );
}
