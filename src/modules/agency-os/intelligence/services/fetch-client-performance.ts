import type { SupabaseClient } from "@supabase/supabase-js";
import { OVERVIEW_CLIENTE_SELECT } from "@/lib/metrics";
import type { ClientPerformanceSnapshot } from "../types";

export async function fetchClientPerformance(
  supabase: SupabaseClient,
  clienteNome: string,
): Promise<ClientPerformanceSnapshot | null> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("vw_overview_cliente")
    .select(OVERVIEW_CLIENTE_SELECT)
    .eq("cliente", clienteNome)
    .gte("data", sinceIso)
    .order("data", { ascending: false });

  if (error || !data?.length) return null;

  const rows = data as {
    meta_spend: number | null;
    google_spend: number | null;
    ga4_sessions: number | null;
    ga4_conversions: number | null;
    meta_results: number | null;
    google_conversions: number | null;
    total_clicks: number | null;
  }[];

  const spend30d = rows.reduce((acc, r) => acc + (r.meta_spend ?? 0) + (r.google_spend ?? 0), 0);
  const sessions30d = rows.reduce((acc, r) => acc + (r.ga4_sessions ?? 0), 0);
  const leads30d = rows.reduce(
    (acc, r) => acc + (r.meta_results ?? 0) + (r.google_conversions ?? 0) + (r.ga4_conversions ?? 0),
    0,
  );
  const clicks30d = rows.reduce((acc, r) => acc + (r.total_clicks ?? 0), 0);

  const mid = Math.floor(rows.length / 2);
  const recent = rows.slice(0, mid);
  const older = rows.slice(mid);
  const recentClicks = recent.reduce((a, r) => a + (r.total_clicks ?? 0), 0);
  const olderClicks = older.reduce((a, r) => a + (r.total_clicks ?? 0), 0);

  let trendLabel: string | null = null;
  if (olderClicks > 0 && recentClicks > olderClicks * 1.1) trendLabel = "CTR em alta";
  else if (olderClicks > 0 && recentClicks < olderClicks * 0.9) trendLabel = "CTR em queda";

  return {
    spend30d,
    leads30d,
    sessions30d,
    trendLabel: trendLabel ?? (clicks30d > 0 ? "Dados ativos" : null),
  };
}
