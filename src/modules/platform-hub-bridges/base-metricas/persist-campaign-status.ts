import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignStatusV1 } from "../../../../contracts/ingest/ingest-envelope.v1";

export async function persistCampaignStatuses(
  supabase: SupabaseClient,
  cliente: string,
  plataforma: string,
  statuses: readonly CampaignStatusV1[] | undefined,
): Promise<void> {
  if (!statuses?.length || !cliente) return;
  const seen = new Map<string, { campanha: string; status: string; adAccountId: string }>();
  for (const item of statuses) {
    const name = item.name.trim();
    const status = item.status.trim();
    const adAccountId = item.adAccountId?.trim() || "";
    if (name && status) seen.set(name, { campanha: name, status, adAccountId });
  }
  if (seen.size === 0) return;
  const updated_at = new Date().toISOString();
  const rows = [...seen.values()].map((item) => ({
    cliente,
    plataforma,
    campanha: item.campanha,
    status: item.status,
    ad_account_id: item.adAccountId,
    updated_at,
  }));
  const { error } = await supabase
    .from("ph_campaign_status")
    .upsert(rows, { onConflict: "cliente,plataforma,campanha" });
  if (error) throw new Error(error.message);
}
